import './ContentRenderer.css';

const getFileLabel = (block) => {
  if (block.fileName) return block.fileName;
  if (block.url) return block.url.split('/').slice(-1)[0];
  return 'Download file';
};

export default function ContentRenderer({ content }) {
  if (!content) return null;
  const { title, summary, coverImage, tags = [], blocks = [] } = content;

  return (
    <article className="content-renderer">
      {(coverImage?.url || title || summary) && (
        <header className="content-header">
          {coverImage?.url && (
            <div className="content-cover">
              <img src={coverImage.url} alt={coverImage.fileName || title || 'Cover'} />
            </div>
          )}
          {title && <h2>{title}</h2>}
          {summary && <p className="content-summary">{summary}</p>}
          {tags.length > 0 && (
            <div className="content-tags">
              {tags.map((tag) => (
                <span key={tag} className="content-tag">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </header>
      )}

      <section className="content-blocks">
        {blocks.map((block, index) => {
          const key = block.id || `${block.type}-${index}`;
          switch (block.type) {
            case 'text': {
              if (block.style === 'heading') {
                return (
                  <h3 key={key} className="content-heading">
                    {block.text}
                  </h3>
                );
              }
              if (block.style === 'quote') {
                return (
                  <blockquote key={key} className="content-quote">
                    {block.text}
                  </blockquote>
                );
              }
              return (
                <p key={key} className="content-paragraph">
                  {block.text}
                </p>
              );
            }
            case 'callout': {
              return (
                <div key={key} className={`content-callout ${block.tone || 'info'}`}>
                  <strong>{block.tone || 'Info'}</strong>
                  <p>{block.text}</p>
                </div>
              );
            }
            case 'image': {
              return (
                <figure key={key} className="content-figure">
                  {block.url && <img src={block.url} alt={block.caption || 'Content visual'} />}
                  {block.caption && <figcaption>{block.caption}</figcaption>}
                </figure>
              );
            }
            case 'video': {
              return (
                <div key={key} className="content-video">
                  {block.url ? (
                    <video controls src={block.url} />
                  ) : (
                    <p className="content-muted">Video pending upload.</p>
                  )}
                  {block.caption && <p className="content-caption">{block.caption}</p>}
                </div>
              );
            }
            case 'file': {
              return (
                <a
                  key={key}
                  className="content-file"
                  href={block.url || '#'}
                  target="_blank"
                  rel="noreferrer"
                >
                  <div>
                    <strong>{getFileLabel(block)}</strong>
                    <span>{block.mimeType || 'File'}</span>
                  </div>
                  <span className="content-file-action">Open</span>
                </a>
              );
            }
            case 'checklist': {
              return (
                <div key={key} className="content-checklist">
                  <strong>Checklist</strong>
                  <ul>
                    {(block.checklist || []).map((item, itemIndex) => (
                      <li key={`${key}-${itemIndex}`}>
                        <span className={item.checked ? 'checked' : ''} />
                        {item.text}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            }
            default:
              return null;
          }
        })}
      </section>
    </article>
  );
}
