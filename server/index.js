import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db, initDb } from "./db.js";
import { logger, Logger } from "./logger.js"

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_KEY || "votre_super_secret_key";

initDb();

// Loggers par module
const logAuth = new Logger("Auth");
const logAPI = new Logger("API");
const logBot = new Logger("Bot");

app.listen(PORT, () => console.log("Listening on", PORT));
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL,
      "https://www.pierrederache.fr",
      "http://localhost:5173",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Middleware de logging des requêtes
app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? "warning" : "debug";

    logAPI[logLevel](`${req.method} ${req.path}`, {
      status: res.statusCode,
      duration: `${duration}ms`,
    });
  });

  next();
});

initDb();

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    logAuth.debug("Token manquant");
    return res.sendStatus(401);
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      logAuth.debug("Token invalide", { error: err.message });
      return res.sendStatus(403);
    }
    req.user = user;
    next();
  });
};

// Middleware pour authentification du bot Discord via API Key
const BOT_API_KEY = process.env.BOT_API_KEY || "tilt_bot_secret_key";
const authenticateBot = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey || apiKey !== BOT_API_KEY) {
    logBot.warning("Clé API invalide");
    return res.status(401).json({ message: "Invalid API key" });
  }
  next();
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
  if (!user) {
    logAuth.debug("Utilisateur non trouvé", { username });
    return res.status(401).json({ message: "Invalid credentials" });
  }

  if (bcrypt.compareSync(password, user.password)) {
    const token = jwt.sign(
      { id: user.id, username: user.username },
      SECRET_KEY,
      { expiresIn: "2h" }
    );
    logAuth.info("Connexion réussie", { username });
    res.json({ token });
  } else {
    logAuth.debug("Mot de passe incorrect", { username });
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
  if (existingUser) {
    logAuth.debug("Username déjà pris", { username });
    return res.status(400).json({ message: "Username already taken" });
  }

  const hash = bcrypt.hashSync(password, 10);
  db.prepare("INSERT INTO users (username, password) VALUES (?, ?)").run(
    username,
    hash
  );

  logAuth.info("Nouvel utilisateur créé", { username });
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
      logAPI.debug("Entrée mise à jour", { userId, date: today, rating });
    } else {
      db.prepare(
        "INSERT INTO entries (user_id, date, rating, description) VALUES (?, ?, ?, ?)"
      ).run(userId, today, rating, description);
      logAPI.info("Nouvelle entrée créée", { userId, date: today, rating });
    }

    res.json({ message: "Saved" });
  } catch (err) {
    logAPI.error("Erreur sauvegarde entrée", { error: err.message, userId });
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
    logAPI.error("Erreur récupération review", { error: err.message, userId });
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

    logAPI.info("Rating enregistré", { fromUserId, toUserId, date, rating });
    res.json({ message: "Rating saved" });
  } catch (err) {
    logAPI.error("Erreur sauvegarde rating", { error: err.message, fromUserId });
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
    logAPI.error("Erreur récupération users", { error: err.message });
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
    logAPI.error("Erreur récupération stats", { error: err.message, userId });
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
    logAPI.error("Erreur récupération stats user", { error: err.message, userId });
    res.status(500).json({ message: "Error fetching user stats" });
  }
});

// ============================================
// ENDPOINTS POUR LE BOT DISCORD
// ============================================

// Récap du jour pour le bot Discord
app.get("/api/recap", authenticateBot, (req, res) => {
  const date = req.query.date || new Date().toISOString().split("T")[0];

  try {
    // Récupère toutes les entrées du jour avec les infos utilisateur
    const entries = db
      .prepare(
        `
        SELECT e.*, u.username
        FROM entries e
        JOIN users u ON u.id = e.user_id
        WHERE e.date = ?
        ORDER BY e.rating DESC
      `
      )
      .all(date);

    // Nombre de ratings donnés ce jour
    const ratingsCount = db
      .prepare(`SELECT COUNT(*) as count FROM ratings WHERE date = ?`)
      .get(date);

    // Calcul des stats
    const participantCount = entries.length;
    const avgRating =
      participantCount > 0
        ? entries.reduce((sum, e) => sum + e.rating, 0) / participantCount
        : 0;

    // Top 3
    const top3 = entries.slice(0, 3).map((e) => ({
      username: e.username,
      rating: e.rating,
      description: e.description,
    }));

    logBot.debug("Récap récupéré", { date, participantCount });

    res.json({
      date,
      participantCount,
      avgRating: Math.round(avgRating * 10) / 10,
      top3,
      ratingsGiven: ratingsCount?.count || 0,
    });
  } catch (err) {
    logBot.error("Erreur récupération récap", { error: err.message, date });
    res.status(500).json({ message: "Error fetching recap" });
  }
});

// Liste des utilisateurs pour le bot (vérification des liens)
app.get("/api/bot/users", authenticateBot, (req, res) => {
  try {
    const users = db
      .prepare("SELECT id, username FROM users ORDER BY username COLLATE NOCASE ASC")
      .all();
    res.json({ users });
  } catch (err) {
    logBot.error("Erreur récupération users", { error: err.message });
    res.status(500).json({ message: "Error fetching users" });
  }
});

// Vérifie si un utilisateur existe (pour le bot)
app.get("/api/bot/user/:username", authenticateBot, (req, res) => {
  const username = req.params.username;

  try {
    const user = db
      .prepare("SELECT id, username FROM users WHERE username = ?")
      .get(username);

    logBot.debug("Vérification utilisateur", { username, exists: !!user });
    res.json({ exists: !!user, user: user || null });
  } catch (err) {
    logBot.error("Erreur vérification user", { error: err.message, username });
    res.status(500).json({ message: "Error checking user" });
  }
});

app.listen(PORT, () => {
  logger.info(`Serveur démarré sur http://localhost:${PORT}`);
});
