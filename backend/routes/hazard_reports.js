/**
 * routes/hazard_reports.js
 *
 * Handles all /api/reports endpoints.
 * Covers full CRUD for hazard reports plus confirm, resolve, and nearby search.
 *
 * Endpoints:
 *   GET    /api/reports                — list all reports
 *   GET    /api/reports/nearby         — geo query: reports within radius
 *   GET    /api/reports/:id            — get one report
 *   POST   /api/reports                — create report
 *   PUT    /api/reports/:id            — update report fields
 *   DELETE /api/reports/:id            — delete report
 *   POST   /api/reports/:id/confirm    — record a confirmation (upvote)
 *   POST   /api/reports/:id/resolve    — vote that the hazard is resolved
 *
 * IMPORTANT: /nearby must be registered BEFORE /:id.
 * Express matches routes in order — if /:id came first, the string "nearby"
 * would be treated as an id and the query would fail with a CastError.
 */

import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../db.js";

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/reports — return all hazard reports
// ---------------------------------------------------------------------------
router.get("/", async (req, res) => {
  try {
    const reports = await getDB()
      .collection("hazard_reports")
      .find()
      .toArray();

    res.status(200).json(reports);
  } catch (err) {
    console.error("GET /api/reports error:", err);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/reports/nearby?lat=&lng=&radius=
// Returns reports within `radius` meters of the given coordinates.
//
// Uses MongoDB's $nearSphere operator on the location.coordinates field,
// which requires a 2dsphere index on that field (see scripts/setup-db.js).
//
// Query params:
//   lat    — latitude  (number)
//   lng    — longitude (number)
//   radius — search radius in meters (number)
// ---------------------------------------------------------------------------
router.get("/nearby", async (req, res) => {
  try {
    const { lat, lng, radius } = req.query;

    if (!lat || !lng || !radius) {
      return res
        .status(400)
        .json({ error: "lat, lng, and radius query params are required" });
    }

    // $nearSphere sorts results by distance (nearest first) and
    // $maxDistance limits results to within the given radius (in meters).
    const reports = await getDB()
      .collection("hazard_reports")
      .find({
        location: {
          $nearSphere: {
            $geometry: {
              type: "Point",
              coordinates: [parseFloat(lng), parseFloat(lat)], // GeoJSON order: [lng, lat]
            },
            $maxDistance: parseFloat(radius),
          },
        },
      })
      .toArray();

    res.status(200).json(reports);
  } catch (err) {
    console.error("GET /api/reports/nearby error:", err);
    res.status(500).json({ error: "Failed to fetch nearby reports" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/reports/:id — return one report by MongoDB _id
// ---------------------------------------------------------------------------
router.get("/:id", async (req, res) => {
  try {
    const report = await getDB()
      .collection("hazard_reports")
      .findOne({ _id: new ObjectId(req.params.id) });

    if (!report) return res.status(404).json({ error: "Report not found" });

    res.status(200).json(report);
  } catch (err) {
    console.error("GET /api/reports/:id error:", err);
    res.status(500).json({ error: "Failed to fetch report" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/reports — create a new hazard report
// Expects: { title, description, categories, location, userId }
// ---------------------------------------------------------------------------
router.post("/", async (req, res) => {
  try {
    const { title, description, categories, location, userId } = req.body;

    if (!title || !description || !categories || !location || !userId) {
      return res.status(400).json({
        error: "title, description, categories, location, and userId are required",
      });
    }

    const newReport = {
      title,
      description,
      categories,            // array of category slugs
      location,              // { type: "Point", coordinates: [lng, lat] }
      userId: new ObjectId(userId),
      createdAt: new Date(),
      updatedAt: null,
      confirmedAt: null,
      confirmCount: 0,
      resolveVotes: [],      // each vote appends a date; count = resolveVotes.length
    };

    const result = await getDB()
      .collection("hazard_reports")
      .insertOne(newReport);

    res.status(201).json({ _id: result.insertedId, ...newReport });
  } catch (err) {
    console.error("POST /api/reports error:", err);
    res.status(500).json({ error: "Failed to create report" });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/reports/:id — update report fields
// ---------------------------------------------------------------------------
router.put("/:id", async (req, res) => {
  try {
    // Strip protected fields so the client cannot overwrite them directly
    const { _id, createdAt, userId, ...updates } = req.body;

    const result = await getDB()
      .collection("hazard_reports")
      .findOneAndUpdate(
        { _id: new ObjectId(req.params.id) },
        { $set: { ...updates, updatedAt: new Date() } },
        { returnDocument: "after" }
      );

    if (!result) return res.status(404).json({ error: "Report not found" });

    res.status(200).json(result);
  } catch (err) {
    console.error("PUT /api/reports/:id error:", err);
    res.status(500).json({ error: "Failed to update report" });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/reports/:id — delete a report
// ---------------------------------------------------------------------------
router.delete("/:id", async (req, res) => {
  try {
    const result = await getDB()
      .collection("hazard_reports")
      .deleteOne({ _id: new ObjectId(req.params.id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Report not found" });
    }

    res.status(200).json({ message: "Report deleted" });
  } catch (err) {
    console.error("DELETE /api/reports/:id error:", err);
    res.status(500).json({ error: "Failed to delete report" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/reports/:id/confirm — record a community confirmation
// Sets confirmedAt to now and increments confirmCount by 1.
// $inc is an atomic increment — safe under concurrent requests.
// ---------------------------------------------------------------------------
router.post("/:id/confirm", async (req, res) => {
  try {
    const result = await getDB()
      .collection("hazard_reports")
      .findOneAndUpdate(
        { _id: new ObjectId(req.params.id) },
        {
          $set: { confirmedAt: new Date() },
          $inc: { confirmCount: 1 },
        },
        { returnDocument: "after" }
      );

    if (!result) return res.status(404).json({ error: "Report not found" });

    res.status(200).json(result);
  } catch (err) {
    console.error("POST /api/reports/:id/confirm error:", err);
    res.status(500).json({ error: "Failed to confirm report" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/reports/:id/resolve — cast a resolve vote
// Pushes the current date onto the resolveVotes array.
// resolveCount is derived as resolveVotes.length — no separate counter needed.
// ---------------------------------------------------------------------------
router.post("/:id/resolve", async (req, res) => {
  try {
    const result = await getDB()
      .collection("hazard_reports")
      .findOneAndUpdate(
        { _id: new ObjectId(req.params.id) },
        { $push: { resolveVotes: new Date() } },
        { returnDocument: "after" }
      );

    if (!result) return res.status(404).json({ error: "Report not found" });

    res.status(200).json(result);
  } catch (err) {
    console.error("POST /api/reports/:id/resolve error:", err);
    res.status(500).json({ error: "Failed to record resolve vote" });
  }
});

export default router;
