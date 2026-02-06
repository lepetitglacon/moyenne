/**
 * GIPHY routes - Proxy for GIPHY API to keep API key server-side
 */

import express from "express";

/**
 * Create GIPHY routes
 * @param {{
 *   config: { giphyApiKey: string },
 *   authenticateToken: Function
 * }} deps
 */
export function createGiphyRoutes({ config, authenticateToken }) {
  const router = express.Router();

  router.get("/giphy/search", authenticateToken, async (req, res, next) => {
    try {
      const { q, limit = 12 } = req.query;

      if (!q || typeof q !== "string" || q.trim().length === 0) {
        return res.status(400).json({ error: "Le parametre q est requis" });
      }

      if (!config.giphyApiKey) {
        return res.status(503).json({ error: "Service GIPHY non configure" });
      }

      const url = new URL("https://api.giphy.com/v1/gifs/search");
      url.searchParams.set("api_key", config.giphyApiKey);
      url.searchParams.set("q", q.trim());
      url.searchParams.set("limit", String(Math.min(Number(limit) || 12, 25)));
      url.searchParams.set("rating", "pg-13");
      url.searchParams.set("lang", "fr");

      const response = await fetch(url.toString());

      if (!response.ok) {
        return res.status(502).json({ error: "Erreur GIPHY API" });
      }

      const data = await response.json();

      const gifs = (data.data || []).map((gif) => ({
        id: gif.id,
        url: gif.images.fixed_height.url,
        previewUrl: gif.images.fixed_height_small.url,
        width: parseInt(gif.images.fixed_height.width, 10),
        height: parseInt(gif.images.fixed_height.height, 10),
      }));

      res.json({ gifs });
    } catch (err) {
      next(err);
    }
  });

  router.get("/giphy/trending", authenticateToken, async (req, res, next) => {
    try {
      const { limit = 12 } = req.query;

      if (!config.giphyApiKey) {
        return res.status(503).json({ error: "Service GIPHY non configure" });
      }

      const url = new URL("https://api.giphy.com/v1/gifs/trending");
      url.searchParams.set("api_key", config.giphyApiKey);
      url.searchParams.set("limit", String(Math.min(Number(limit) || 12, 25)));
      url.searchParams.set("rating", "pg-13");

      const response = await fetch(url.toString());

      if (!response.ok) {
        return res.status(502).json({ error: "Erreur GIPHY API" });
      }

      const data = await response.json();

      const gifs = (data.data || []).map((gif) => ({
        id: gif.id,
        url: gif.images.fixed_height.url,
        previewUrl: gif.images.fixed_height_small.url,
        width: parseInt(gif.images.fixed_height.width, 10),
        height: parseInt(gif.images.fixed_height.height, 10),
      }));

      res.json({ gifs });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
