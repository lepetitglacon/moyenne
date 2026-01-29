const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db, initDb } = require('./db');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'votre_super_secret_key'; // En production, utilisez une variable d'environnement

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Database
initDb();

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Routes

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password required' });
  }

  const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
  const user = stmt.get(username);

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  if (bcrypt.compareSync(password, user.password)) {
    const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

// Register (Optional, for easy testing)
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password required' });
  }

  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const stmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
    const info = stmt.run(username, hashedPassword);
    res.status(201).json({ id: info.lastInsertRowid, username });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ message: 'Username already exists' });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
});

// Protected Route Example
app.get('/api/protected', authenticateToken, (req, res) => {
  res.json({ message: 'This is a protected data', user: req.user });
});

// --- ENTRIES ROUTES ---

// Post/Update daily entry
app.post('/api/entries', authenticateToken, (req, res) => {
  console.log('Received entry POST:', req.body, 'User:', req.user.id);
  const { rating, description } = req.body; // Date is now ignored from body
  const userId = req.user.id;
  // Always use server date for "today"
  const entryDate = new Date().toISOString().split('T')[0];

  if (rating === undefined || rating < 0 || rating > 10) {
    console.log('Validation failed: rating', rating);
    return res.status(400).json({ message: 'Rating must be between 0 and 10' });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO entries (user_id, date, rating, description)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, date) DO UPDATE SET
      rating = excluded.rating,
      description = excluded.description
    `);
    const result = stmt.run(userId, entryDate, rating, description);
    console.log('Insert result:', result);
    res.json({ message: 'Entry saved successfully', date: entryDate });
  } catch (err) {
    console.error('SQL Error:', err);
    res.status(500).json({ message: 'Error saving entry' });
  }
});

// Get today's entry
app.get('/api/entries/today', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const today = new Date().toISOString().split('T')[0];
  try {
    const stmt = db.prepare('SELECT * FROM entries WHERE user_id = ? AND date = ?');
    const entry = stmt.get(userId, today);
    res.json(entry || null);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching today entry' });
  }
});

// Get user history (last 14 days)
app.get('/api/entries/history', authenticateToken, (req, res) => {
  const userId = req.user.id;
  try {
    const stmt = db.prepare(`
      SELECT * FROM entries 
      WHERE user_id = ? 
      ORDER BY date DESC 
      LIMIT 14
    `);
    const entries = stmt.all(userId);
    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching history' });
  }
});

// --- STATS ROUTES ---

// Helper for stats queries
const getStats = (userId = null) => {
  const whereClause = userId ? 'WHERE user_id = ?' : '';
  const params = userId ? [userId, userId, userId] : [];
  
  // SQLite modifiers for date
  const sql = `
    SELECT 
      (SELECT AVG(rating) FROM entries ${whereClause}) as all_time,
      (SELECT AVG(rating) FROM entries WHERE strftime('%Y-%W', date) = strftime('%Y-%W', 'now') ${userId ? 'AND user_id = ?' : ''}) as current_week,
      (SELECT AVG(rating) FROM entries WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now') ${userId ? 'AND user_id = ?' : ''}) as current_month
  `;
  
  const stmt = db.prepare(sql);
  return stmt.get(...params);
};

// Public Stats (Global)
app.get('/api/stats/public', (req, res) => {
  try {
    const stats = getStats(null); // No user filter
    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching public stats' });
  }
});

// Private Stats (Me)
app.get('/api/stats/me', authenticateToken, (req, res) => {
  try {
    const stats = getStats(req.user.id);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching user stats' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
