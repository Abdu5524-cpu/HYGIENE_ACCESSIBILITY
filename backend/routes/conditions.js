/**
 * routes/conditions.js
 *
 * Exposes the seeded conditions collection so the frontend can
 * display the full list of accessibility conditions on the profile screen.
 *
 * Endpoints:
 *   GET /api/conditions — return all conditions (label, slug, activates)
 */

import { Router } from "express";
import { getDB } from "../db.js";

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/conditions — return all conditions
// ---------------------------------------------------------------------------
router.get("/", async (req, res) => {
  try {
    const conditions = await getDB()
      .collection("conditions")
      .find()
      .toArray();

    res.status(200).json(conditions);
  } catch (err) {
    console.error("GET /api/conditions error:", err);
    res.status(500).json({ error: "Failed to fetch conditions" });
  }
});

export default router;
