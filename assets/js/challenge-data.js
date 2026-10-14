// The challenge catalogue: public metadata only. Flags are never stored here —
// their SHA-256 hashes live in Firestore (flagHashes), which no client can read.
// The admin page seeds Firestore from this list.
export const CATEGORIES = {
  web: { label: 'Web Security', page: 'web-security.html' },
  crypto: { label: 'Cryptography', page: 'cryptography.html' },
  awareness: { label: 'Security Awareness', page: 'security-awareness.html' },
  ethics: { label: 'Cybersecurity Ethics', page: 'ethics.html' }
};

export const CHALLENGES = [
  { id: 'WEB-01', category: 'web', title: 'Hidden in Plain Sight', difficulty: 'Easy', points: 50 },
  { id: 'WEB-02', category: 'web', title: 'Guest Access', difficulty: 'Easy', points: 75 },
  { id: 'WEB-03', category: 'web', title: 'The Quotation Mark', difficulty: 'Medium', points: 100 },
  { id: 'WEB-04', category: 'web', title: 'Leaky Endpoint', difficulty: 'Hard', points: 125 },
  { id: 'CRY-01', category: 'crypto', title: 'Base of Operations', difficulty: 'Easy', points: 50 },
  { id: 'CRY-02', category: 'crypto', title: 'Caesar’s Message', difficulty: 'Easy', points: 100 },
  { id: 'CRY-03', category: 'crypto', title: 'The Reused Key', difficulty: 'Medium', points: 150 },
  { id: 'AWR-01', category: 'awareness', title: 'Urgent: Verify Your Account', difficulty: 'Easy', points: 50 },
  { id: 'AWR-02', category: 'awareness', title: 'Password Audit', difficulty: 'Easy', points: 75 },
  { id: 'AWR-03', category: 'awareness', title: 'The Helpful Caller', difficulty: 'Medium', points: 125 },
  { id: 'ETH-01', category: 'ethics', title: 'In Scope, Out of Scope', difficulty: 'Medium', points: 150 },
  { id: 'ETH-02', category: 'ethics', title: 'The Disclosure Dilemma', difficulty: 'Medium', points: 150 }
];

export const TOTAL_POINTS = CHALLENGES.reduce((sum, c) => sum + c.points, 0);
