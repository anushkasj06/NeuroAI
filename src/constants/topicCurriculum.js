/**
 * Hierarchical subject → topics → subtopics curriculum.
 * Used for topic selection in the study plan generator.
 */

export const TOPIC_CURRICULUM = {
  // ── ENGINEERING ──────────────────────────────────────────────────────────
  data_structures: {
    name: 'Data Structures',
    topics: [
      { name: 'Arrays', subtopics: ['1D Arrays', '2D Arrays', 'Dynamic Arrays', 'Array Operations'] },
      { name: 'Linked Lists', subtopics: ['Singly Linked List', 'Doubly Linked List', 'Circular Linked List'] },
      { name: 'Stacks & Queues', subtopics: ['Stack Operations', 'Queue Operations', 'Deque', 'Priority Queue'] },
      { name: 'Trees', subtopics: ['Binary Tree', 'BST', 'AVL Tree', 'Heap', 'Trie'] },
      { name: 'Graphs', subtopics: ['BFS', 'DFS', 'Shortest Path', 'Minimum Spanning Tree'] },
      { name: 'Hashing', subtopics: ['Hash Functions', 'Collision Resolution', 'Hash Maps'] },
      { name: 'Sorting Algorithms', subtopics: ['Bubble Sort', 'Merge Sort', 'Quick Sort', 'Heap Sort'] },
      { name: 'Searching Algorithms', subtopics: ['Linear Search', 'Binary Search', 'Interpolation Search'] },
    ],
  },
  algorithms: {
    name: 'Algorithms',
    topics: [
      { name: 'Divide & Conquer', subtopics: ['Merge Sort', 'Quick Sort', 'Binary Search'] },
      { name: 'Dynamic Programming', subtopics: ['Memoization', 'Tabulation', 'Knapsack', 'LCS', 'LIS'] },
      { name: 'Greedy Algorithms', subtopics: ['Activity Selection', "Huffman's", 'Prim\'s', 'Kruskal\'s'] },
      { name: 'Backtracking', subtopics: ['N-Queens', 'Sudoku Solver', 'Subset Sum'] },
      { name: 'Graph Algorithms', subtopics: ['Dijkstra', 'Bellman-Ford', 'Floyd-Warshall', 'Topological Sort'] },
      { name: 'String Algorithms', subtopics: ['KMP', 'Rabin-Karp', 'Z-Algorithm'] },
      { name: 'Complexity Analysis', subtopics: ['Big O Notation', 'Time Complexity', 'Space Complexity'] },
    ],
  },
  dbms: {
    name: 'DBMS',
    topics: [
      { name: 'ER Model', subtopics: ['Entities', 'Relationships', 'Attributes', 'ER Diagrams'] },
      { name: 'Relational Model', subtopics: ['Relations', 'Keys', 'Constraints', 'Relational Algebra'] },
      { name: 'SQL', subtopics: ['DDL', 'DML', 'DCL', 'Joins', 'Subqueries', 'Aggregation'] },
      { name: 'Normalization', subtopics: ['1NF', '2NF', '3NF', 'BCNF', 'Decomposition'] },
      { name: 'Transactions', subtopics: ['ACID Properties', 'Concurrency Control', 'Deadlocks', 'Recovery'] },
      { name: 'Indexing', subtopics: ['B-Trees', 'B+ Trees', 'Hashing', 'Clustered vs Non-Clustered'] },
      { name: 'NoSQL', subtopics: ['Document DB', 'Key-Value', 'Column Family', 'Graph DB'] },
    ],
  },
  operating_systems: {
    name: 'Operating Systems',
    topics: [
      { name: 'Process Management', subtopics: ['Process States', 'PCB', 'Context Switching', 'Threads'] },
      { name: 'CPU Scheduling', subtopics: ['FCFS', 'SJF', 'Round Robin', 'Priority Scheduling'] },
      { name: 'Memory Management', subtopics: ['Paging', 'Segmentation', 'Virtual Memory', 'Page Replacement'] },
      { name: 'Deadlocks', subtopics: ['Conditions', 'Prevention', 'Avoidance', 'Detection', 'Recovery'] },
      { name: 'File Systems', subtopics: ['File Allocation', 'Directory Structure', 'Disk Scheduling'] },
      { name: 'Synchronization', subtopics: ['Mutex', 'Semaphores', 'Monitors', 'Classic Problems'] },
    ],
  },
  computer_networks: {
    name: 'Computer Networks',
    topics: [
      { name: 'OSI Model', subtopics: ['Physical Layer', 'Data Link', 'Network', 'Transport', 'Application'] },
      { name: 'TCP/IP', subtopics: ['IP Addressing', 'Subnetting', 'TCP', 'UDP', 'ICMP'] },
      { name: 'Routing', subtopics: ['RIP', 'OSPF', 'BGP', 'Routing Tables'] },
      { name: 'Application Layer', subtopics: ['HTTP/HTTPS', 'DNS', 'SMTP', 'FTP', 'SSH'] },
      { name: 'Network Security', subtopics: ['Firewalls', 'VPN', 'SSL/TLS', 'Cryptography Basics'] },
      { name: 'Wireless Networks', subtopics: ['WiFi Standards', 'Bluetooth', 'Cellular Networks'] },
    ],
  },
  oop: {
    name: 'OOP',
    topics: [
      { name: 'Core Concepts', subtopics: ['Classes & Objects', 'Encapsulation', 'Inheritance', 'Polymorphism', 'Abstraction'] },
      { name: 'Design Patterns', subtopics: ['Singleton', 'Factory', 'Observer', 'Strategy', 'Decorator'] },
      { name: 'SOLID Principles', subtopics: ['SRP', 'OCP', 'LSP', 'ISP', 'DIP'] },
      { name: 'UML', subtopics: ['Class Diagrams', 'Sequence Diagrams', 'Use Case Diagrams'] },
    ],
  },
  java: {
    name: 'Java',
    topics: [
      { name: 'Core Java', subtopics: ['Syntax', 'Data Types', 'Control Flow', 'Arrays', 'Strings'] },
      { name: 'OOP in Java', subtopics: ['Classes', 'Inheritance', 'Interfaces', 'Abstract Classes'] },
      { name: 'Collections', subtopics: ['ArrayList', 'LinkedList', 'HashMap', 'HashSet', 'TreeMap'] },
      { name: 'Exception Handling', subtopics: ['Try-Catch', 'Custom Exceptions', 'Finally'] },
      { name: 'Multithreading', subtopics: ['Threads', 'Runnable', 'Synchronization', 'Executor'] },
      { name: 'Java 8+', subtopics: ['Lambda', 'Streams', 'Optional', 'Functional Interfaces'] },
    ],
  },
  python: {
    name: 'Python',
    topics: [
      { name: 'Core Python', subtopics: ['Syntax', 'Data Types', 'Control Flow', 'Functions', 'Modules'] },
      { name: 'Data Structures', subtopics: ['Lists', 'Tuples', 'Dictionaries', 'Sets', 'Comprehensions'] },
      { name: 'OOP in Python', subtopics: ['Classes', 'Inheritance', 'Magic Methods', 'Decorators'] },
      { name: 'File Handling', subtopics: ['Reading/Writing', 'CSV', 'JSON', 'Context Managers'] },
      { name: 'Libraries', subtopics: ['NumPy', 'Pandas', 'Matplotlib', 'Requests'] },
    ],
  },
  machine_learning: {
    name: 'Machine Learning',
    topics: [
      { name: 'Supervised Learning', subtopics: ['Linear Regression', 'Logistic Regression', 'Decision Trees', 'SVM', 'KNN'] },
      { name: 'Unsupervised Learning', subtopics: ['K-Means', 'Hierarchical Clustering', 'PCA', 'DBSCAN'] },
      { name: 'Neural Networks', subtopics: ['Perceptron', 'Backpropagation', 'Activation Functions', 'CNN', 'RNN'] },
      { name: 'Model Evaluation', subtopics: ['Accuracy', 'Precision/Recall', 'F1 Score', 'Cross Validation', 'ROC'] },
      { name: 'Feature Engineering', subtopics: ['Normalization', 'Encoding', 'Feature Selection', 'Dimensionality Reduction'] },
    ],
  },
  web_development: {
    name: 'Web Development',
    topics: [
      { name: 'HTML & CSS', subtopics: ['Semantic HTML', 'CSS Flexbox', 'CSS Grid', 'Responsive Design'] },
      { name: 'JavaScript', subtopics: ['DOM', 'Events', 'Async/Await', 'Fetch API', 'ES6+'] },
      { name: 'React', subtopics: ['Components', 'Hooks', 'State Management', 'Routing', 'Context'] },
      { name: 'Node.js', subtopics: ['Express', 'REST APIs', 'Middleware', 'Authentication'] },
      { name: 'Databases', subtopics: ['MongoDB', 'SQL Basics', 'ORM/ODM'] },
    ],
  },
  mathematics: {
    name: 'Mathematics',
    topics: [
      { name: 'Algebra', subtopics: ['Linear Equations', 'Quadratic Equations', 'Matrices', 'Determinants'] },
      { name: 'Calculus', subtopics: ['Limits', 'Derivatives', 'Integration', 'Differential Equations'] },
      { name: 'Probability', subtopics: ['Basic Probability', 'Conditional Probability', 'Distributions', 'Bayes Theorem'] },
      { name: 'Statistics', subtopics: ['Mean/Median/Mode', 'Variance', 'Hypothesis Testing', 'Regression'] },
      { name: 'Discrete Math', subtopics: ['Set Theory', 'Logic', 'Graph Theory', 'Combinatorics'] },
    ],
  },

  // ── SCHOOL ───────────────────────────────────────────────────────────────
  science: {
    name: 'Science',
    topics: [
      { name: 'Physics', subtopics: ['Motion', 'Force', 'Energy', 'Light', 'Sound', 'Electricity'] },
      { name: 'Chemistry', subtopics: ['Atoms', 'Periodic Table', 'Chemical Reactions', 'Acids & Bases'] },
      { name: 'Biology', subtopics: ['Cell Biology', 'Photosynthesis', 'Human Body', 'Genetics', 'Ecology'] },
    ],
  },
  physics: {
    name: 'Physics',
    topics: [
      { name: 'Mechanics', subtopics: ['Motion', 'Newton\'s Laws', 'Work & Energy', 'Momentum'] },
      { name: 'Electricity', subtopics: ['Current', 'Voltage', 'Resistance', 'Circuits', 'Magnetism'] },
      { name: 'Optics', subtopics: ['Reflection', 'Refraction', 'Lenses', 'Mirrors'] },
      { name: 'Thermodynamics', subtopics: ['Heat', 'Temperature', 'Laws of Thermodynamics'] },
    ],
  },
  chemistry: {
    name: 'Chemistry',
    topics: [
      { name: 'Atomic Structure', subtopics: ['Atoms', 'Electrons', 'Periodic Table', 'Bonding'] },
      { name: 'Chemical Reactions', subtopics: ['Types of Reactions', 'Balancing Equations', 'Stoichiometry'] },
      { name: 'Organic Chemistry', subtopics: ['Hydrocarbons', 'Functional Groups', 'Polymers'] },
      { name: 'Electrochemistry', subtopics: ['Electrolysis', 'Galvanic Cells', 'Corrosion'] },
    ],
  },
  biology: {
    name: 'Biology',
    topics: [
      { name: 'Cell Biology', subtopics: ['Cell Structure', 'Cell Division', 'Organelles', 'Membrane Transport'] },
      { name: 'Genetics', subtopics: ['DNA', 'RNA', 'Protein Synthesis', 'Mendelian Genetics', 'Mutations'] },
      { name: 'Human Physiology', subtopics: ['Digestive System', 'Circulatory System', 'Nervous System', 'Endocrine System'] },
      { name: 'Ecology', subtopics: ['Ecosystems', 'Food Chains', 'Biodiversity', 'Environmental Issues'] },
      { name: 'Evolution', subtopics: ['Natural Selection', 'Adaptation', 'Speciation'] },
    ],
  },
  english: {
    name: 'English',
    topics: [
      { name: 'Grammar', subtopics: ['Parts of Speech', 'Tenses', 'Voice', 'Narration', 'Clauses'] },
      { name: 'Writing', subtopics: ['Essay Writing', 'Letter Writing', 'Report Writing', 'Paragraph Writing'] },
      { name: 'Reading Comprehension', subtopics: ['Passage Analysis', 'Inference', 'Vocabulary'] },
      { name: 'Literature', subtopics: ['Poetry', 'Prose', 'Drama', 'Short Stories'] },
    ],
  },
  history: {
    name: 'History',
    topics: [
      { name: 'Ancient History', subtopics: ['Civilizations', 'Empires', 'Trade Routes'] },
      { name: 'Medieval History', subtopics: ['Feudalism', 'Crusades', 'Renaissance'] },
      { name: 'Modern History', subtopics: ['Industrial Revolution', 'World Wars', 'Independence Movements'] },
      { name: 'Indian History', subtopics: ['Mughal Empire', 'British Rule', 'Freedom Struggle', 'Post-Independence'] },
    ],
  },
  geography: {
    name: 'Geography',
    topics: [
      { name: 'Physical Geography', subtopics: ['Landforms', 'Climate', 'Rivers', 'Oceans'] },
      { name: 'Human Geography', subtopics: ['Population', 'Migration', 'Urbanization', 'Agriculture'] },
      { name: 'Maps & Cartography', subtopics: ['Map Reading', 'Scale', 'Latitude/Longitude', 'Projections'] },
      { name: 'Environmental Geography', subtopics: ['Natural Resources', 'Pollution', 'Climate Change'] },
    ],
  },
};

/**
 * Get topics for a given subject slug.
 * Returns [] if subject not found.
 */
export const getTopicsForSubject = (subjectSlug) => {
  return TOPIC_CURRICULUM[subjectSlug]?.topics || [];
};

/**
 * Get all subtopics for a given subject + topic name.
 */
export const getSubtopicsForTopic = (subjectSlug, topicName) => {
  const topics = getTopicsForSubject(subjectSlug);
  return topics.find((t) => t.name === topicName)?.subtopics || [];
};
