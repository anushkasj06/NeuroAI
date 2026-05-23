/**
 * Subjects and topics available for battle room configuration.
 * Mirrors backend educationSubjects.js — kept in sync manually.
 */

export const BATTLE_SUBJECTS = [
  // Engineering
  { slug: 'data_structures',       name: 'Data Structures',        topics: ['Arrays', 'Linked Lists', 'Trees', 'Graphs', 'Stacks & Queues', 'Hashing', 'Sorting'] },
  { slug: 'algorithms',            name: 'Algorithms',             topics: ['Divide & Conquer', 'Dynamic Programming', 'Greedy', 'Backtracking', 'Graph Algorithms', 'Complexity'] },
  { slug: 'dbms',                  name: 'DBMS',                   topics: ['ER Model', 'SQL', 'Normalization', 'Transactions', 'Indexing', 'NoSQL'] },
  { slug: 'operating_systems',     name: 'Operating Systems',      topics: ['Process Management', 'CPU Scheduling', 'Memory Management', 'Deadlocks', 'File Systems'] },
  { slug: 'computer_networks',     name: 'Computer Networks',      topics: ['OSI Model', 'TCP/IP', 'Routing', 'Application Layer', 'Network Security'] },
  { slug: 'oop',                   name: 'OOP',                    topics: ['Core Concepts', 'Design Patterns', 'SOLID Principles', 'UML'] },
  { slug: 'java',                  name: 'Java',                   topics: ['Core Java', 'Collections', 'Exception Handling', 'Multithreading', 'Java 8+'] },
  { slug: 'python',                name: 'Python',                 topics: ['Core Python', 'Data Structures', 'OOP', 'Libraries'] },
  { slug: 'machine_learning',      name: 'Machine Learning',       topics: ['Supervised Learning', 'Unsupervised Learning', 'Neural Networks', 'Model Evaluation'] },
  { slug: 'web_development',       name: 'Web Development',        topics: ['HTML & CSS', 'JavaScript', 'React', 'Node.js'] },
  { slug: 'mathematics',           name: 'Mathematics',            topics: ['Algebra', 'Calculus', 'Probability', 'Statistics', 'Discrete Math'] },
  // School
  { slug: 'science',               name: 'Science',                topics: ['Physics', 'Chemistry', 'Biology'] },
  { slug: 'physics',               name: 'Physics',                topics: ['Mechanics', 'Electricity', 'Optics', 'Thermodynamics'] },
  { slug: 'chemistry',             name: 'Chemistry',              topics: ['Atomic Structure', 'Chemical Reactions', 'Organic Chemistry'] },
  { slug: 'biology',               name: 'Biology',                topics: ['Cell Biology', 'Genetics', 'Human Physiology', 'Ecology'] },
  { slug: 'history',               name: 'History',                topics: ['Ancient History', 'Medieval History', 'Modern History', 'Indian History'] },
  { slug: 'geography',             name: 'Geography',              topics: ['Physical Geography', 'Human Geography', 'Maps', 'Environment'] },
  { slug: 'english',               name: 'English',                topics: ['Grammar', 'Writing', 'Reading Comprehension', 'Literature'] },
];

export const getTopicsForSubject = (slug) =>
  BATTLE_SUBJECTS.find((s) => s.slug === slug)?.topics || [];
