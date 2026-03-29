/**
 * routes/categories.js
 *
 * Exposes the seeded categories collection so the frontend can
 * populate the alert creation form with real category slugs.
 *
 * Endpoints:
 *   GET /api/categories — return all categories (label, slug)
 */

import { Router } from "express";
import { getDB } from "../db.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const categories = await getDB()
      .collection("categories")
      .find()
      .toArray();

    res.status(200).json(categories);
  } catch (err) {
    console.error("GET /api/categories error:", err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

export default router;
