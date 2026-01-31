const express = require("express");
const cors = require("cors");
const path = require("path");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { db, initDb } = require("./db");

const app = express();
const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Listening on", port));
const SECRET_KEY = "votre_super_secret_key";

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

initDb();

import cors from "cors";

app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL,
      "https://www.pierrederache.fr",
    ],
    credentials: true,
  })
);

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Helper: mois demandé via query ?month=YYYY-MM (sinon mois courant)
function getMonthRange(monthParam) {
  let y, m;

  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    y = Number(monthParam.slice(0, 4));
    m = Number(monthParam.slice(5, 7));
  } else {
    const now = new Date();
    y = now.getFullYear();
    m = now.getMonth() + 1;
  }

  const monthStart = `${y}-${String(m).padStart(2, "0")}-01`;

  // 1er jour du mois suivant
  const nextMonth = new Date(y, (m - 1) + 1, 1);
  // dernier jour du mois courant
  const monthEnd = new Date(nextMonth.getTime() - 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  return { monthStart, monthEnd };
}

// Login
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ message: "Username and password required" });

  const user = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(username);
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  if (bcrypt.compareSync(password, user.password)) {
    const token = jwt.sign(
      { id: user.id, username: user.username },
      SECRET_KEY,
      { expiresIn: "2h" }
    );
    res.json({ token });
  } else {
    res.status(401).json({ message: "Invalid credentials" });
  }
});

// Register
app.post("/api/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ message: "Username and password required" });

  const existingUser = db
    .prepare("SELECT id FROM users WHERE username = ?")
    .get(username);
  if (existingUser)
    return res.status(400).json({ message: "Username already taken" });

  const hash = bcrypt.hashSync(password, 10);
  db.prepare("INSERT INTO users (username, password) VALUES (?, ?)").run(
    username,
    hash
  );

  res.json({ message: "User created" });
});

// Add entry
app.post("/api/entries", authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { rating, description } = req.body;

  const today = new Date().toISOString().split("T")[0];

  try {
    const existing = db
      .prepare("SELECT id FROM entries WHERE user_id = ? AND date = ?")
      .get(userId, today);

    if (existing) {
      db.prepare(
        "UPDATE entries SET rating = ?, description = ? WHERE id = ?"
      ).run(rating, description, existing.id);
    } else {
      db.prepare(
        "INSERT INTO entries (user_id, date, rating, description) VALUES (?, ?, ?, ?)"
      ).run(userId, today, rating, description);
    }

    res.json({ message: "Saved" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error saving entry" });
  }
});

// Get next review
app.get("/api/review/next", authenticateToken, (req, res) => {
  const userId = req.user.id;
  const today = new Date().toISOString().split("T")[0];

  try {
    const entry = db
      .prepare(
        `
      SELECT e.user_id, u.username, e.date, e.rating, e.description
      FROM entries e
      JOIN users u ON u.id = e.user_id
      WHERE e.user_id != ?
        AND e.date = ?
        AND NOT EXISTS (
          SELECT 1 FROM ratings r
          WHERE r.from_user_id = ?
            AND r.to_user_id = e.user_id
            AND r.date = e.date
        )
      ORDER BY RANDOM()
      LIMIT 1
    `
      )
      .get(userId, today, userId);

    if (!entry) return res.json({ done: true });

    res.json({
      userId: entry.user_id,
      username: entry.username,
      date: entry.date,
      rating: entry.rating,
      description: entry.description,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching next review" });
  }
});

// Add rating
app.post("/api/ratings", authenticateToken, (req, res) => {
  const fromUserId = req.user.id;
  const { toUserId, date, rating } = req.body;

  try {
    db.prepare(
      "INSERT INTO ratings (from_user_id, to_user_id, date, rating) VALUES (?, ?, ?, ?)"
    ).run(fromUserId, toUserId, date, rating);

    res.json({ message: "Rating saved" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error saving rating" });
  }
});

// Liste des utilisateurs (pour explorer les stats)
app.get("/api/users", authenticateToken, (req, res) => {
  try {
    const users = db
      .prepare(
        'SELECT id, username FROM users ORDER BY username COLLATE NOCASE ASC'
      )
      .all();
    res.json({ users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching users" });
  }
});

// Get stats (me) : /api/me/stats?month=YYYY-MM
app.get("/api/me/stats", authenticateToken, (req, res) => {
  const userId = req.user.id;

  const today = new Date().toISOString().split("T")[0];
  const { monthStart, monthEnd } = getMonthRange(req.query.month);

  try {
    const lastEntry = db
      .prepare(
        `
      SELECT date, rating, description
      FROM entries
      WHERE user_id = ?
      ORDER BY date DESC
      LIMIT 1
    `
      )
      .get(userId);

    const todayEntry = db
      .prepare(
        `
      SELECT date, rating, description
      FROM entries
      WHERE user_id = ? AND date = ?
      LIMIT 1
    `
      )
      .get(userId, today);

    const participation = db
      .prepare(`SELECT COUNT(*) as count FROM entries WHERE user_id = ?`)
      .get(userId);

    const monthAvgRow = db
      .prepare(
        `
      SELECT AVG(rating) as avg
      FROM entries
      WHERE user_id = ?
        AND date >= ?
        AND date <= ?
    `
      )
      .get(userId, monthStart, monthEnd);

    const monthEntries = db
      .prepare(
        `
      SELECT date, rating
      FROM entries
      WHERE user_id = ?
        AND date >= ?
        AND date <= ?
      ORDER BY date ASC
    `
      )
      .all(userId, monthStart, monthEnd);

    res.json({
      today,
      monthStart,
      monthEnd,
      lastEntry: lastEntry || null,
      todayEntry: todayEntry || null,
      participationCount: participation?.count ?? 0,
      currentMonthAvg: monthAvgRow?.avg ?? null,
      monthEntries,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching stats" });
  }
});

// Stats d'un utilisateur (pour explorer les profils) : /api/users/:id/stats?month=YYYY-MM
app.get("/api/users/:id/stats", authenticateToken, (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isFinite(userId)) {
    return res.status(400).json({ message: "Invalid user id" });
  }

  const today = new Date().toISOString().split("T")[0];
  const { monthStart, monthEnd } = getMonthRange(req.query.month);

  try {
    const user = db
      .prepare("SELECT id, username FROM users WHERE id = ?")
      .get(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const lastEntry = db
      .prepare(
        `
      SELECT date, rating, description
      FROM entries
      WHERE user_id = ?
      ORDER BY date DESC
      LIMIT 1
    `
      )
      .get(userId);

    const todayEntry = db
      .prepare(
        `
      SELECT date, rating, description
      FROM entries
      WHERE user_id = ? AND date = ?
      LIMIT 1
    `
      )
      .get(userId, today);

    const participation = db
      .prepare(`SELECT COUNT(*) as count FROM entries WHERE user_id = ?`)
      .get(userId);

    const monthAvgRow = db
      .prepare(
        `
      SELECT AVG(rating) as avg
      FROM entries
      WHERE user_id = ?
        AND date >= ?
        AND date <= ?
    `
      )
      .get(userId, monthStart, monthEnd);

    const monthEntries = db
      .prepare(
        `
      SELECT date, rating
      FROM entries
      WHERE user_id = ?
        AND date >= ?
        AND date <= ?
      ORDER BY date ASC
    `
      )
      .all(userId, monthStart, monthEnd);

    res.json({
      user,
      today,
      monthStart,
      monthEnd,
      lastEntry: lastEntry || null,
      todayEntry: todayEntry || null,
      participationCount: participation?.count ?? 0,
      currentMonthAvg: monthAvgRow?.avg ?? null,
      monthEntries,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching user stats" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
