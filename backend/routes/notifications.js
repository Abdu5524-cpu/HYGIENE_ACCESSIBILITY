/**
 * routes/notifications.js
 *
 * Handles all /api/notifications endpoints.
 * Covers full CRUD for notifications plus seen and dismiss actions.
 *
 * Endpoints:
 *   GET    /api/notifications              — list all notifications
 *   GET    /api/notifications/user/:userId — all notifications for a user
 *   GET    /api/notifications/:id          — get one notification
 *   POST   /api/notifications              — create notification
 *   PUT    /api/notifications/:id/seen     — mark as seen (set seenAt)
 *   PUT    /api/notifications/:id/dismiss  — mark as dismissed
 *   DELETE /api/notifications/:id         — delete notification
 *
 * IMPORTANT: /user/:userId must be registered BEFORE /:id.
 * Same reason as in hazard_reports.js — literal path segments must come
 * before wildcard segments to avoid being swallowed by /:id.
 */

import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../db.js";

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/notifications — return all notifications
// ---------------------------------------------------------------------------
router.get("/", async (req, res) => {
  try {
    const notifications = await getDB()
      .collection("notifications")
      .find()
      .toArray();

    res.status(200).json(notifications);
  } catch (err) {
    console.error("GET /api/notifications error:", err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/notifications/user/:userId — all notifications for a specific user
// Registered before /:id so "user" isn't mistaken for a document id
// ---------------------------------------------------------------------------
router.get("/user/:userId", async (req, res) => {
  try {
    const notifications = await getDB()
      .collection("notifications")
      .find({ userId: new ObjectId(req.params.userId) })
      .toArray();

    res.status(200).json(notifications);
  } catch (err) {
    console.error("GET /api/notifications/user/:userId error:", err);
    res.status(500).json({ error: "Failed to fetch user notifications" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/notifications/:id — return one notification by _id
// ---------------------------------------------------------------------------
router.get("/:id", async (req, res) => {
  try {
    const notification = await getDB()
      .collection("notifications")
      .findOne({ _id: new ObjectId(req.params.id) });

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.status(200).json(notification);
  } catch (err) {
    console.error("GET /api/notifications/:id error:", err);
    res.status(500).json({ error: "Failed to fetch notification" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/notifications — create a new notification
// Expects: { userId, reportId }
// ---------------------------------------------------------------------------
router.post("/", async (req, res) => {
  try {
    const { userId, reportId } = req.body;

    if (!userId || !reportId) {
      return res.status(400).json({ error: "userId and reportId are required" });
    }

    const newNotification = {
      userId: new ObjectId(userId),
      reportId: new ObjectId(reportId),
      // seenAt omitted on creation — Atlas schema requires date type if present
      dismissed: false,
      createdAt: new Date(),
    };

    const result = await getDB()
      .collection("notifications")
      .insertOne(newNotification);

    res.status(201).json({ _id: result.insertedId, ...newNotification });
  } catch (err) {
    console.error("POST /api/notifications error:", err);
    res.status(500).json({ error: "Failed to create notification" });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/notifications/:id/seen — record when the user saw the notification
// ---------------------------------------------------------------------------
router.put("/:id/seen", async (req, res) => {
  try {
    const result = await getDB()
      .collection("notifications")
      .findOneAndUpdate(
        { _id: new ObjectId(req.params.id) },
        { $set: { seenAt: new Date() } },
        { returnDocument: "after" }
      );

    if (!result) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.status(200).json(result);
  } catch (err) {
    console.error("PUT /api/notifications/:id/seen error:", err);
    res.status(500).json({ error: "Failed to mark notification as seen" });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/notifications/:id/dismiss — mark notification as dismissed
// ---------------------------------------------------------------------------
router.put("/:id/dismiss", async (req, res) => {
  try {
    const result = await getDB()
      .collection("notifications")
      .findOneAndUpdate(
        { _id: new ObjectId(req.params.id) },
        { $set: { dismissed: true } },
        { returnDocument: "after" }
      );

    if (!result) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.status(200).json(result);
  } catch (err) {
    console.error("PUT /api/notifications/:id/dismiss error:", err);
    res.status(500).json({ error: "Failed to dismiss notification" });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/notifications/:id — delete a notification
// ---------------------------------------------------------------------------
router.delete("/:id", async (req, res) => {
  try {
    const result = await getDB()
      .collection("notifications")
      .deleteOne({ _id: new ObjectId(req.params.id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.status(200).json({ message: "Notification deleted" });
  } catch (err) {
    console.error("DELETE /api/notifications/:id error:", err);
    res.status(500).json({ error: "Failed to delete notification" });
  }
});

export default router;
