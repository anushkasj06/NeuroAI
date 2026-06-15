const axios = require('axios');
const cheerio = require('cheerio');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Cache-Control': 'max-age=0',
};

function normalizeLinkedInUrl(url) {
  if (!url) throw new Error('LinkedIn URL is required');
  url = url.trim();
  if (!url.startsWith('http')) url = 'https://' + url;
  // Ensure we hit the public profile (no trailing slash issues)
  const m = url.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/);
  if (!m) throw new Error('Invalid LinkedIn profile URL. Expected format: linkedin.com/in/username');
  return `https://www.linkedin.com/in/${m[1]}/`;
}

function extractJsonLd(html) {
  const $ = cheerio.load(html);
  const data = {};
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html());
      if (json['@type'] === 'Person' || json?.mainEntity?.['@type'] === 'Person') {
        const person = json['@type'] === 'Person' ? json : json.mainEntity;
        if (person.name)        data.name     = person.name;
        if (person.description) data.about    = person.description;
        if (person.jobTitle)    data.headline = person.jobTitle;
        if (person.address?.addressLocality) data.location = person.address.addressLocality;
        if (Array.isArray(person.knowsAbout)) data.skills = person.knowsAbout.map(String);
        if (Array.isArray(person.alumniOf)) {
          data.education = person.alumniOf.map(e => ({
            school: e.name || '',
            degree: e.award || '',
            period: '',
          }));
        }
        if (Array.isArray(person.worksFor)) {
          data.experience = person.worksFor.map(e => ({
            title:   e.roleName || e.name || '',
            company: e.name || '',
            duration:'',
            description:'',
          }));
        }
      }
    } catch {}
  });
  return data;
}

function extractFromDom($, existing) {
  const data = { ...existing };

  // Name
  if (!data.name) {
    data.name =
      $('h1').first().text().trim() ||
      $('[data-anonymize="person-name"]').first().text().trim() ||
      $('title').text().replace('| LinkedIn','').replace('LinkedIn','').trim();
  }

  // Headline
  if (!data.headline) {
    data.headline =
      $('[data-anonymize="headline"]').first().text().trim() ||
      $('.top-card-layout__headline').first().text().trim() ||
      $('h2').first().text().trim();
  }

  // Location
  if (!data.location) {
    data.location =
      $('[data-anonymize="location"]').first().text().trim() ||
      $('.top-card__subline-item').first().text().trim();
  }

  // About / summary
  if (!data.about) {
    data.about =
      $('.core-section-container__content .with-line-clamp').first().text().trim() ||
      $('[data-anonymize="about"]').first().text().trim() ||
      $('section.summary p').first().text().trim();
  }

  // Experience
  if (!data.experience || !data.experience.length) {
    const exp = [];
    $('section[data-section="experience"] li, .experience-item, [class*="experience"] li').each((_, el) => {
      const title   = $(el).find('[data-anonymize="job-title"], .experience-item__title, h3').first().text().trim();
      const company = $(el).find('[data-anonymize="company-name"], .experience-item__subtitle, h4').first().text().trim();
      const duration= $(el).find('[data-anonymize="duration"], .experience-item__duration, .date-range').first().text().trim();
      const description = $(el).find('[data-anonymize="job-description"], .experience-item__description, p').first().text().trim();
      if (title || company) exp.push({ title, company, duration, description });
    });
    if (exp.length) data.experience = exp;
  }

  // Education
  if (!data.education || !data.education.length) {
    const edu = [];
    $('section[data-section="education"] li, .education-item, [class*="education"] li').each((_, el) => {
      const school = $(el).find('[data-anonymize="school-name"], .education-item__school-name, h3').first().text().trim();
      const degree = $(el).find('[data-anonymize="education-degree"], .education-item__degree-info, h4').first().text().trim();
      const period = $(el).find('.date-range, .education-item__date-range').first().text().trim();
      if (school) edu.push({ school, degree, period });
    });
    if (edu.length) data.education = edu;
  }

  // Skills
  if (!data.skills || !data.skills.length) {
    const skills = [];
    $('[data-anonymize="skill-name"], .skill-category-entity__name, .pv-skill-category-entity__name').each((_, el) => {
      const t = $(el).text().trim();
      if (t) skills.push(t);
    });
    // Also parse meta keywords
    const meta = $('meta[name="keywords"]').attr('content') || '';
    if (meta) skills.push(...meta.split(',').map(s => s.trim()).filter(Boolean));
    if (skills.length) data.skills = [...new Set(skills)];
  }

  // Certifications
  if (!data.certifications || !data.certifications.length) {
    const certs = [];
    $('section[data-section="certifications"] li, [class*="certification"] li').each((_, el) => {
      const t = $(el).find('h3, [data-anonymize="certification-name"]').first().text().trim();
      if (t) certs.push(t);
    });
    if (certs.length) data.certifications = certs;
  }

  // Posts — LinkedIn doesn't expose post text on public pages,
  // but we grab any activity snippets that appear
  if (!data.posts || !data.posts.length) {
    const posts = [];
    $('[data-anonymize="post-content"], .feed-shared-text, .share-update-card__update-text').each((_, el) => {
      const t = $(el).text().trim();
      if (t && t.length > 20) posts.push(t.slice(0, 300));
    });
    if (posts.length) data.posts = posts;
  }

  return data;
}

/**
 * Scrape a LinkedIn public profile.
 * Returns structured data or throws with a descriptive error.
 */
async function scrapeLinkedIn(rawUrl) {
  const url = normalizeLinkedInUrl(rawUrl);

  let html;
  try {
    const res = await axios.get(url, {
      headers: HEADERS,
      timeout: 20000,
      maxRedirects: 5,
      decompress: true,
    });
    html = res.data;
  } catch (e) {
    if (e.response?.status === 999 || e.response?.status === 429) {
      throw new Error('LinkedIn is rate-limiting requests. Try again in a few minutes, or make your profile public.');
    }
    if (e.response?.status === 404) {
      throw new Error('LinkedIn profile not found. Check the URL and make sure the profile is public.');
    }
    if (e.response?.status === 401 || e.response?.status === 403) {
      throw new Error('LinkedIn requires login to view this profile. Make sure your profile is set to public.');
    }
    throw new Error(`Could not fetch LinkedIn profile: ${e.message}`);
  }

  // LinkedIn sometimes redirects to login — detect it
  if (
    html.includes('authwall') ||
    html.includes('join/') ||
    html.includes('uas/login') ||
    html.includes('checkpoint/challenge')
  ) {
    throw new Error('LinkedIn blocked the request (auth wall). Make sure your profile visibility is set to "Public" in LinkedIn settings.');
  }

  const $ = cheerio.load(html);

  // Try JSON-LD first (most reliable), then DOM fallback
  let data = extractJsonLd(html);
  data = extractFromDom($, data);

  // Ensure arrays are clean
  data.skills        = [...new Set((data.skills        || []).filter(Boolean))];
  data.certifications= [...new Set((data.certifications|| []).filter(Boolean))];
  data.experience    = (data.experience || []).filter(e => e.title || e.company);
  data.education     = (data.education  || []).filter(e => e.school);
  data.posts         = (data.posts      || []).filter(Boolean);

  if (!data.name && !data.headline && !data.skills.length) {
    throw new Error('Could not extract profile data. LinkedIn may be blocking the request or the profile is private.');
  }

  return { ...data, scrapedAt: new Date(), scrapeError: null };
}

module.exports = { scrapeLinkedIn, normalizeLinkedInUrl };
