"""Algorithmic skill gap analysis and roadmap generation engine.

This module generates personalized career roadmaps WITHOUT requiring LLM calls.
It uses a skill taxonomy with prerequisites, difficulty levels, and learning paths
to produce structured, actionable roadmaps purely through algorithms.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Optional
from urllib.parse import quote_plus


# ===== Skill Taxonomy =====
# Each skill has: category, difficulty (1-5), prerequisites, learning_hours, resources

@dataclass
class SkillNode:
    name: str
    category: str  # "programming", "data", "cloud", "ml", "soft", "tools", "domain"
    difficulty: int  # 1=beginner, 5=expert
    prerequisites: list[str] = field(default_factory=list)
    learning_hours: int = 40
    keywords: list[str] = field(default_factory=list)  # aliases for matching


SKILL_TAXONOMY: dict[str, SkillNode] = {
    # Programming
    "python": SkillNode("Python", "programming", 2, [], 60, ["python", "py"]),
    "java": SkillNode("Java", "programming", 3, [], 80, ["java", "jdk"]),
    "javascript": SkillNode("JavaScript", "programming", 2, [], 60, ["javascript", "js", "es6"]),
    "typescript": SkillNode("TypeScript", "programming", 3, ["javascript"], 40, ["typescript", "ts"]),
    "c++": SkillNode("C++", "programming", 4, [], 100, ["c++", "cpp"]),
    "c": SkillNode("C", "programming", 3, [], 80, ["c programming"]),
    "go": SkillNode("Go", "programming", 3, [], 50, ["go", "golang"]),
    "rust": SkillNode("Rust", "programming", 4, [], 80, ["rust"]),
    "kotlin": SkillNode("Kotlin", "programming", 3, ["java"], 50, ["kotlin"]),
    "swift": SkillNode("Swift", "programming", 3, [], 60, ["swift"]),
    "sql": SkillNode("SQL", "data", 2, [], 40, ["sql", "mysql", "postgresql", "postgres"]),
    "nosql": SkillNode("NoSQL", "data", 3, ["sql"], 30, ["nosql", "mongodb", "redis", "dynamodb"]),
    # Data & Analytics
    "pandas": SkillNode("Pandas", "data", 2, ["python"], 30, ["pandas"]),
    "numpy": SkillNode("NumPy", "data", 2, ["python"], 20, ["numpy"]),
    "statistics": SkillNode("Statistics", "data", 3, [], 60, ["statistics", "stats", "probability"]),
    "data visualization": SkillNode("Data Visualization", "data", 2, ["python"], 30, ["matplotlib", "seaborn", "plotly", "visualization"]),
    "excel": SkillNode("Excel", "data", 1, [], 20, ["excel", "spreadsheet"]),
    "power bi": SkillNode("Power BI", "data", 2, [], 30, ["power bi", "powerbi"]),
    "tableau": SkillNode("Tableau", "data", 2, [], 30, ["tableau"]),
    "analytics": SkillNode("Analytics", "data", 3, ["sql", "statistics"], 40, ["analytics", "data analysis"]),
    # ML & AI
    "machine learning": SkillNode("Machine Learning", "ml", 4, ["python", "statistics", "numpy"], 100, ["machine learning", "ml", "scikit-learn", "sklearn"]),
    "deep learning": SkillNode("Deep Learning", "ml", 5, ["machine learning", "python"], 80, ["deep learning", "neural networks", "dl"]),
    "tensorflow": SkillNode("TensorFlow", "ml", 4, ["deep learning", "python"], 50, ["tensorflow", "tf"]),
    "pytorch": SkillNode("PyTorch", "ml", 4, ["deep learning", "python"], 50, ["pytorch", "torch"]),
    "nlp": SkillNode("NLP", "ml", 4, ["machine learning", "python"], 60, ["nlp", "natural language", "text mining"]),
    "computer vision": SkillNode("Computer Vision", "ml", 4, ["deep learning"], 60, ["computer vision", "cv", "opencv"]),
    # Web & Backend
    "react": SkillNode("React", "programming", 3, ["javascript"], 50, ["react", "reactjs"]),
    "node": SkillNode("Node.js", "programming", 3, ["javascript"], 50, ["node", "nodejs", "express"]),
    "spring": SkillNode("Spring Boot", "programming", 4, ["java"], 60, ["spring", "spring boot", "springboot"]),
    "django": SkillNode("Django", "programming", 3, ["python"], 40, ["django"]),
    "fastapi": SkillNode("FastAPI", "programming", 3, ["python"], 30, ["fastapi"]),
    "html": SkillNode("HTML", "programming", 1, [], 15, ["html", "html5"]),
    "css": SkillNode("CSS", "programming", 2, ["html"], 30, ["css", "css3", "tailwind", "sass"]),
    "api": SkillNode("REST APIs", "programming", 3, [], 30, ["api", "rest", "restful", "graphql"]),
    "microservices": SkillNode("Microservices", "programming", 4, ["api", "docker"], 50, ["microservices", "service mesh"]),
    # Cloud & DevOps
    "aws": SkillNode("AWS", "cloud", 3, [], 60, ["aws", "amazon web services", "ec2", "s3", "lambda"]),
    "azure": SkillNode("Azure", "cloud", 3, [], 60, ["azure", "microsoft azure"]),
    "gcp": SkillNode("GCP", "cloud", 3, [], 60, ["gcp", "google cloud"]),
    "docker": SkillNode("Docker", "cloud", 3, [], 30, ["docker", "containers", "containerization"]),
    "kubernetes": SkillNode("Kubernetes", "cloud", 4, ["docker"], 50, ["kubernetes", "k8s"]),
    "ci/cd": SkillNode("CI/CD", "cloud", 3, ["git"], 30, ["ci/cd", "jenkins", "github actions", "gitlab ci"]),
    "linux": SkillNode("Linux", "cloud", 2, [], 40, ["linux", "ubuntu", "bash", "shell"]),
    "terraform": SkillNode("Terraform", "cloud", 4, ["aws"], 40, ["terraform", "iac", "infrastructure as code"]),
    # Tools
    "git": SkillNode("Git", "tools", 2, [], 15, ["git", "github", "gitlab", "version control"]),
    "agile": SkillNode("Agile/Scrum", "tools", 2, [], 15, ["agile", "scrum", "kanban", "jira"]),
    "system design": SkillNode("System Design", "domain", 4, ["api", "sql"], 60, ["system design", "architecture", "scalability"]),
    # Soft Skills
    "communication": SkillNode("Communication", "soft", 2, [], 20, ["communication", "presentation"]),
    "problem solving": SkillNode("Problem Solving", "soft", 3, [], 40, ["problem solving", "dsa", "algorithms", "data structures"]),
    "leadership": SkillNode("Leadership", "soft", 3, [], 20, ["leadership", "management", "teamwork"]),
    # Mobile
    "android": SkillNode("Android", "programming", 3, ["kotlin"], 60, ["android"]),
    "ios": SkillNode("iOS", "programming", 3, ["swift"], 60, ["ios", "xcode"]),
    "flutter": SkillNode("Flutter", "programming", 3, [], 50, ["flutter", "dart"]),
    "react native": SkillNode("React Native", "programming", 3, ["react"], 40, ["react native"]),
}


# ===== Role Skill Requirements with Weights =====
# Each role maps to required skills with importance weight (0-1)

ROLE_REQUIREMENTS: dict[str, dict[str, float]] = {
    "data scientist": {"python": 1.0, "statistics": 0.9, "machine learning": 1.0, "sql": 0.8, "pandas": 0.8, "numpy": 0.7, "data visualization": 0.6, "deep learning": 0.5, "communication": 0.5},
    "data analyst": {"sql": 1.0, "excel": 0.7, "python": 0.7, "statistics": 0.8, "power bi": 0.6, "tableau": 0.6, "analytics": 0.9, "communication": 0.7, "data visualization": 0.8},
    "machine learning engineer": {"python": 1.0, "machine learning": 1.0, "deep learning": 0.8, "tensorflow": 0.6, "pytorch": 0.6, "sql": 0.6, "docker": 0.5, "aws": 0.5, "system design": 0.4},
    "ml engineer": {"python": 1.0, "machine learning": 1.0, "deep learning": 0.8, "tensorflow": 0.6, "pytorch": 0.6, "sql": 0.6, "docker": 0.5, "aws": 0.5},
    "backend developer": {"java": 0.8, "python": 0.7, "sql": 0.9, "api": 0.9, "spring": 0.7, "docker": 0.6, "microservices": 0.5, "git": 0.7, "linux": 0.5, "system design": 0.5},
    "frontend developer": {"javascript": 1.0, "react": 0.9, "typescript": 0.7, "html": 0.8, "css": 0.8, "git": 0.6, "api": 0.5},
    "full stack developer": {"javascript": 0.9, "react": 0.8, "node": 0.7, "sql": 0.8, "api": 0.9, "git": 0.7, "docker": 0.5, "html": 0.6, "css": 0.6, "typescript": 0.5},
    "full stack java developer": {"java": 1.0, "spring": 0.9, "javascript": 0.8, "react": 0.7, "sql": 0.9, "api": 0.9, "docker": 0.6, "git": 0.7, "html": 0.5, "css": 0.5, "microservices": 0.5},
    "cloud engineer": {"aws": 0.9, "docker": 0.8, "kubernetes": 0.8, "linux": 0.8, "terraform": 0.6, "ci/cd": 0.7, "python": 0.5, "system design": 0.5},
    "devops engineer": {"docker": 0.9, "kubernetes": 0.8, "aws": 0.8, "ci/cd": 0.9, "linux": 0.9, "terraform": 0.6, "git": 0.8, "python": 0.5},
    "mobile developer": {"kotlin": 0.6, "swift": 0.6, "flutter": 0.6, "react native": 0.6, "api": 0.7, "git": 0.6},
    "android developer": {"kotlin": 0.9, "java": 0.7, "android": 1.0, "api": 0.7, "sql": 0.5, "git": 0.6},
    "ios developer": {"swift": 1.0, "ios": 1.0, "api": 0.7, "git": 0.6},
    "software engineer": {"python": 0.7, "java": 0.7, "sql": 0.7, "api": 0.8, "git": 0.8, "system design": 0.6, "problem solving": 0.8, "docker": 0.4},
}


# ===== Learning Resources Database =====
SKILL_RESOURCES: dict[str, list[dict[str, str]]] = {
    "python": [
        {"title": "Python for Everybody (Coursera)", "url": "https://www.coursera.org/specializations/python"},
        {"title": "Automate the Boring Stuff", "url": "https://automatetheboringstuff.com/"},
        {"title": "Python Crash Course (YouTube)", "url": "https://www.youtube.com/results?search_query=python+crash+course+2024"},
    ],
    "java": [
        {"title": "Java Programming MOOC (Helsinki)", "url": "https://java-programming.mooc.fi/"},
        {"title": "Spring Boot Tutorial", "url": "https://spring.io/guides/gs/spring-boot"},
        {"title": "Java Full Course (YouTube)", "url": "https://www.youtube.com/results?search_query=java+full+course+2024"},
    ],
    "javascript": [
        {"title": "JavaScript.info", "url": "https://javascript.info/"},
        {"title": "freeCodeCamp JS", "url": "https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/"},
        {"title": "JS Crash Course (YouTube)", "url": "https://www.youtube.com/results?search_query=javascript+crash+course"},
    ],
    "react": [
        {"title": "React Official Tutorial", "url": "https://react.dev/learn"},
        {"title": "Full React Course (Scrimba)", "url": "https://scrimba.com/learn/learnreact"},
        {"title": "React Projects (YouTube)", "url": "https://www.youtube.com/results?search_query=react+project+tutorial+2024"},
    ],
    "sql": [
        {"title": "SQLBolt Interactive", "url": "https://sqlbolt.com/"},
        {"title": "Mode SQL Tutorial", "url": "https://mode.com/sql-tutorial/"},
        {"title": "SQL for Data Science (Coursera)", "url": "https://www.coursera.org/learn/sql-for-data-science"},
    ],
    "machine learning": [
        {"title": "Andrew Ng ML Course (Coursera)", "url": "https://www.coursera.org/learn/machine-learning"},
        {"title": "Fast.ai Practical ML", "url": "https://course.fast.ai/"},
        {"title": "Kaggle Learn ML", "url": "https://www.kaggle.com/learn/intro-to-machine-learning"},
    ],
    "docker": [
        {"title": "Docker Getting Started", "url": "https://docs.docker.com/get-started/"},
        {"title": "Docker Crash Course (YouTube)", "url": "https://www.youtube.com/results?search_query=docker+tutorial+beginners"},
        {"title": "Play with Docker", "url": "https://labs.play-with-docker.com/"},
    ],
    "aws": [
        {"title": "AWS Cloud Practitioner (Free)", "url": "https://aws.amazon.com/training/digital/aws-cloud-practitioner-essentials/"},
        {"title": "AWS Skill Builder", "url": "https://skillbuilder.aws/"},
        {"title": "AWS Solutions Architect (YouTube)", "url": "https://www.youtube.com/results?search_query=aws+solutions+architect+2024"},
    ],
    "kubernetes": [
        {"title": "Kubernetes Basics (Official)", "url": "https://kubernetes.io/docs/tutorials/kubernetes-basics/"},
        {"title": "KodeKloud Free Labs", "url": "https://kodekloud.com/courses/kubernetes-for-the-absolute-beginners/"},
        {"title": "K8s Crash Course (YouTube)", "url": "https://www.youtube.com/results?search_query=kubernetes+crash+course"},
    ],
    "system design": [
        {"title": "System Design Primer (GitHub)", "url": "https://github.com/donnemartin/system-design-primer"},
        {"title": "Grokking System Design", "url": "https://www.designgurus.io/course/grokking-the-system-design-interview"},
        {"title": "System Design (YouTube)", "url": "https://www.youtube.com/results?search_query=system+design+interview"},
    ],
    "git": [
        {"title": "Git Handbook (GitHub)", "url": "https://guides.github.com/introduction/git-handbook/"},
        {"title": "Learn Git Branching", "url": "https://learngitbranching.js.org/"},
        {"title": "Git & GitHub Crash Course", "url": "https://www.youtube.com/results?search_query=git+github+crash+course"},
    ],
}


# ===== Core Algorithm =====

@dataclass
class SkillGapResult:
    role: str
    goal: str
    readiness: float
    matched_skills: list[str]
    missing_skills: list[str]
    roadmap: dict
    resources: list[dict]


def _normalize_skill(name: str) -> str:
    return name.lower().strip().replace("-", " ").replace("_", " ")


def _match_skill_to_taxonomy(skill_name: str) -> Optional[str]:
    """Match a user skill name to a taxonomy key using fuzzy matching."""
    normalized = _normalize_skill(skill_name)
    # Direct match
    if normalized in SKILL_TAXONOMY:
        return normalized
    # Keyword match
    for key, node in SKILL_TAXONOMY.items():
        if normalized in node.keywords or any(kw in normalized for kw in node.keywords):
            return key
        if any(normalized in kw or kw in normalized for kw in node.keywords):
            return key
    return None


def _find_role_requirements(target: str) -> dict[str, float]:
    """Find the best matching role requirements for a target role/goal."""
    target_lower = target.lower().strip()

    # Direct match
    if target_lower in ROLE_REQUIREMENTS:
        return ROLE_REQUIREMENTS[target_lower]

    # Partial match
    best_match = None
    best_score = 0
    for role_key, reqs in ROLE_REQUIREMENTS.items():
        # Check overlap
        if role_key in target_lower or target_lower in role_key:
            score = len(role_key)
            if score > best_score:
                best_score = score
                best_match = reqs
        # Token overlap
        role_tokens = set(role_key.split())
        target_tokens = set(target_lower.split())
        overlap = len(role_tokens & target_tokens)
        if overlap > best_score:
            best_score = overlap
            best_match = reqs

    if best_match:
        return best_match

    # Default: software engineer requirements
    return ROLE_REQUIREMENTS.get("software engineer", {"python": 0.7, "sql": 0.7, "git": 0.7, "api": 0.7})


def _compute_skill_priority(skill_key: str, weight: float, user_skills: set[str]) -> float:
    """Compute priority score for learning a skill based on weight, difficulty, and prerequisites."""
    node = SKILL_TAXONOMY.get(skill_key)
    if not node:
        return weight * 0.5

    # Higher weight = higher priority
    priority = weight

    # Penalize skills with unmet prerequisites
    unmet_prereqs = [p for p in node.prerequisites if p not in user_skills]
    if unmet_prereqs:
        priority *= 0.6  # Reduce priority if prereqs aren't met

    # Slightly prefer easier skills (faster wins)
    difficulty_factor = 1.0 - (node.difficulty - 1) * 0.05
    priority *= difficulty_factor

    return priority


def _topological_sort_skills(skills: list[str]) -> list[str]:
    """Sort skills respecting prerequisite dependencies."""
    # Build dependency graph
    graph: dict[str, list[str]] = {s: [] for s in skills}
    in_degree: dict[str, int] = {s: 0 for s in skills}
    skill_set = set(skills)

    for skill in skills:
        node = SKILL_TAXONOMY.get(skill)
        if node:
            for prereq in node.prerequisites:
                if prereq in skill_set:
                    graph[prereq].append(skill)
                    in_degree[skill] += 1

    # Kahn's algorithm
    queue = [s for s in skills if in_degree[s] == 0]
    result = []
    while queue:
        # Sort by difficulty (easier first) for tie-breaking
        queue.sort(key=lambda s: SKILL_TAXONOMY.get(s, SkillNode(s, "", 3)).difficulty)
        current = queue.pop(0)
        result.append(current)
        for neighbor in graph.get(current, []):
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    # Add any remaining (circular deps)
    for s in skills:
        if s not in result:
            result.append(s)

    return result


def _generate_actions(skill_key: str, user_projects: list[str], user_experience: list[str]) -> list[str]:
    """Generate specific learning actions for a skill, personalized to user's background."""
    node = SKILL_TAXONOMY.get(skill_key)
    skill_name = node.name if node else skill_key.title()
    actions = []

    # Base action: learn the skill
    if node and node.difficulty <= 2:
        actions.append(f"Complete an interactive tutorial on {skill_name} (2-3 hours)")
    elif node and node.difficulty <= 3:
        actions.append(f"Take a structured online course on {skill_name} (1-2 weeks)")
    else:
        actions.append(f"Study {skill_name} fundamentals through documentation and courses (2-3 weeks)")

    # Project-based action
    project_context = ""
    if user_projects:
        # Reference their existing projects
        project_context = user_projects[0] if len(user_projects) > 0 else ""
    if project_context and len(project_context) > 5:
        actions.append(f"Extend your project '{project_context[:50]}' by integrating {skill_name}")
    else:
        actions.append(f"Build a mini-project using {skill_name} (portfolio piece)")

    # Practice action
    if node and node.category == "programming":
        actions.append(f"Solve 10-15 coding problems involving {skill_name} on LeetCode/HackerRank")
    elif node and node.category == "cloud":
        actions.append(f"Set up a free-tier {skill_name} environment and deploy a sample app")
    elif node and node.category == "data":
        actions.append(f"Analyze a real dataset using {skill_name} and publish findings on GitHub")

    return actions[:3]


def generate_roadmap(
    target: str,
    goal: str,
    user_skills: list[dict],
    user_projects: list[str] | None = None,
    user_experience: list[str] | None = None,
    user_name: str = "Student",
    user_branch: str | None = None,
) -> SkillGapResult:
    """Generate a complete skill gap analysis and roadmap algorithmically."""
    projects = user_projects or []
    experience = user_experience or []

    # 1. Find role requirements
    requirements = _find_role_requirements(target)

    # 2. Match user skills to taxonomy
    user_skill_keys: set[str] = set()
    for skill in user_skills:
        name = skill.get("name", "") if isinstance(skill, dict) else str(skill)
        matched = _match_skill_to_taxonomy(name)
        if matched:
            user_skill_keys.add(matched)

    # 3. Compute matched and missing skills
    matched_skills = []
    missing_skills_with_priority = []

    for skill_key, weight in requirements.items():
        if skill_key in user_skill_keys:
            matched_skills.append(skill_key)
        else:
            priority = _compute_skill_priority(skill_key, weight, user_skill_keys)
            missing_skills_with_priority.append((skill_key, priority, weight))

    # Sort missing by priority (highest first)
    missing_skills_with_priority.sort(key=lambda x: x[1], reverse=True)
    missing_keys = [s[0] for s in missing_skills_with_priority]

    # 4. Compute readiness (weighted)
    total_weight = sum(requirements.values())
    matched_weight = sum(requirements.get(s, 0) for s in matched_skills)
    readiness = matched_weight / max(total_weight, 0.01)

    # 5. Topological sort missing skills (respect prerequisites)
    sorted_missing = _topological_sort_skills(missing_keys)

    # 6. Split into 3 phases based on prerequisites and difficulty
    phases = _build_phases(sorted_missing, user_skill_keys, projects, experience, target, readiness)

    # 7. Generate readiness summary
    readiness_pct = int(readiness * 100)
    if readiness >= 0.8:
        readiness_summary = f"Strong position at {readiness_pct}% readiness. Focus on polishing {', '.join(sorted_missing[:2]) if sorted_missing else 'interview skills'} to be fully competitive."
    elif readiness >= 0.5:
        readiness_summary = f"Solid foundation at {readiness_pct}% readiness. You have {len(matched_skills)} of {len(requirements)} required skills. Close the gap in {', '.join(sorted_missing[:3])} to reach interview-ready status."
    else:
        readiness_summary = f"Building from {readiness_pct}% readiness. Focus on the fundamentals first: {', '.join(sorted_missing[:3])}. Your existing skills in {', '.join(matched_skills[:3]) if matched_skills else 'your background'} give you a head start."

    # 8. Immediate action
    if sorted_missing:
        first_skill = sorted_missing[0]
        node = SKILL_TAXONOMY.get(first_skill)
        immediate = f"Start learning {node.name if node else first_skill} this week — it's the highest-impact skill gap for {target}."
    else:
        immediate = f"You're well-prepared! Focus on building a portfolio project that demonstrates your {target} skills and start applying."

    # 9. Six month outcome
    six_month = f"Interview-ready for {target} roles with {min(len(sorted_missing), 6)} new skills and 2-3 portfolio projects demonstrating competence."

    roadmap = {
        "phases": phases,
        "immediate_action": immediate,
        "six_month_outcome": six_month,
        "readiness_summary": readiness_summary,
    }

    # 10. Generate resources
    resources = _build_resources(sorted_missing[:6])

    # Format skill names for display
    display_matched = [SKILL_TAXONOMY[s].name if s in SKILL_TAXONOMY else s.title() for s in matched_skills]
    display_missing = [SKILL_TAXONOMY[s].name if s in SKILL_TAXONOMY else s.title() for s in sorted_missing]

    return SkillGapResult(
        role=target,
        goal=goal,
        readiness=round(readiness, 2),
        matched_skills=display_matched,
        missing_skills=display_missing,
        roadmap=roadmap,
        resources=resources,
    )


def _build_phases(
    sorted_missing: list[str],
    user_skills: set[str],
    projects: list[str],
    experience: list[str],
    target: str,
    readiness: float,
) -> list[dict]:
    """Build 3 learning phases from sorted missing skills."""
    if not sorted_missing:
        return [
            {"phase": 1, "title": "Portfolio & Projects", "duration": "1-2 months",
             "skills": ["portfolio building"], "actions": ["Build a showcase project for " + target, "Write technical blog posts about your work", "Contribute to open-source projects"], "milestone": "Published portfolio with 2+ projects"},
            {"phase": 2, "title": "Interview Preparation", "duration": "1-2 months",
             "skills": ["system design", "problem solving"], "actions": ["Practice system design questions", "Do mock interviews", "Study common interview patterns"], "milestone": "Confident in technical interviews"},
            {"phase": 3, "title": "Job Applications", "duration": "1-2 months",
             "skills": ["networking", "applications"], "actions": ["Apply to 5-10 companies per week", "Network on LinkedIn", "Attend tech meetups"], "milestone": "Receive interview calls"},
        ]

    # Split skills into 3 groups: foundation → depth → mastery
    n = len(sorted_missing)
    phase1_skills = sorted_missing[:max(1, n // 3)]
    phase2_skills = sorted_missing[max(1, n // 3):max(2, 2 * n // 3)]
    phase3_skills = sorted_missing[max(2, 2 * n // 3):]

    # If phase3 is empty, add interview prep
    if not phase3_skills:
        phase3_skills = ["system design"] if "system design" not in user_skills else ["problem solving"]

    def _phase_duration(skills: list[str]) -> str:
        total_hours = sum(SKILL_TAXONOMY.get(s, SkillNode(s, "", 3, [], 40)).learning_hours for s in skills)
        weeks = max(2, total_hours // 15)  # ~15 hours/week study
        if weeks <= 4:
            return f"{weeks} weeks"
        months = math.ceil(weeks / 4)
        return f"{months}-{months + 1} months"

    phases = []

    # Phase 1: Foundation
    p1_actions = []
    for s in phase1_skills[:3]:
        p1_actions.extend(_generate_actions(s, projects, experience)[:1])
    phases.append({
        "phase": 1,
        "title": "Foundation & Quick Wins",
        "duration": _phase_duration(phase1_skills),
        "skills": [SKILL_TAXONOMY[s].name if s in SKILL_TAXONOMY else s.title() for s in phase1_skills[:3]],
        "actions": p1_actions[:3] or ["Start with the highest-priority skill gap"],
        "milestone": f"Complete foundational learning in {SKILL_TAXONOMY[phase1_skills[0]].name if phase1_skills[0] in SKILL_TAXONOMY else phase1_skills[0]}",
    })

    # Phase 2: Building Depth
    p2_actions = []
    for s in phase2_skills[:3]:
        p2_actions.extend(_generate_actions(s, projects, experience)[:1])
    if not p2_actions:
        p2_actions = [f"Build a project combining {', '.join(phase1_skills[:2])}"]
    phases.append({
        "phase": 2,
        "title": "Building Depth & Projects",
        "duration": _phase_duration(phase2_skills) if phase2_skills else "2-3 months",
        "skills": [SKILL_TAXONOMY[s].name if s in SKILL_TAXONOMY else s.title() for s in phase2_skills[:3]],
        "actions": p2_actions[:3] or ["Build a portfolio project", "Contribute to open source"],
        "milestone": "Portfolio-ready project demonstrating new skills",
    })

    # Phase 3: Interview Ready
    p3_actions = _generate_actions(phase3_skills[0] if phase3_skills else "system design", projects, experience)
    p3_actions.append(f"Practice {target} interview questions and mock interviews")
    phases.append({
        "phase": 3,
        "title": "Interview Ready & Job Search",
        "duration": "1-2 months",
        "skills": [SKILL_TAXONOMY[s].name if s in SKILL_TAXONOMY else s.title() for s in phase3_skills[:3]],
        "actions": p3_actions[:3],
        "milestone": f"Ready to interview for {target} positions",
    })

    return phases


def _build_resources(skills: list[str]) -> list[dict]:
    """Build learning resources for missing skills."""
    resources = []
    for skill_key in skills:
        node = SKILL_TAXONOMY.get(skill_key)
        skill_name = node.name if node else skill_key.title()

        if skill_key in SKILL_RESOURCES:
            res_list = SKILL_RESOURCES[skill_key]
        else:
            # Generate generic resources
            encoded = quote_plus(skill_name)
            res_list = [
                {"title": f"{skill_name} Course (Coursera)", "url": f"https://www.coursera.org/search?query={encoded}"},
                {"title": f"{skill_name} Tutorial (YouTube)", "url": f"https://www.youtube.com/results?search_query={encoded}+tutorial+2024"},
                {"title": f"Learn {skill_name} (Udemy)", "url": f"https://www.udemy.com/courses/search/?q={encoded}"},
            ]

        resources.append({"skill": skill_name, "resources": res_list[:3]})

    return resources
