/**
 * routes/users.js
 *
 * Handles all /api/users endpoints.
 * Covers full CRUD for user accounts plus condition management.
 *
 * Rules enforced here:
 *   - Passwords are hashed with bcrypt before storage
 *   - passwordHash is never returned in any response
 *   - updatedAt is set to now on every PUT
 *
 * Endpoints:
 *   GET    /api/users                          — list all users
 *   GET    /api/users/:id                      — get one user
 *   POST   /api/users                          — create user
 *   PUT    /api/users/:id                      — update user
 *   DELETE /api/users/:id                      — delete user
 *   POST   /api/users/:id/conditions           — add condition slug
 *   DELETE /api/users/:id/conditions/:slug     — remove condition slug
 *   POST   /api/users/:id/custom-conditions    — add custom condition
 *   DELETE /api/users/:id/custom-conditions/:name — remove custom condition
 */

import { Router } from "express";
import { ObjectId } from "mongodb";
import bcrypt from "bcrypt";
import { getDB } from "../db.js";

const router = Router();

// How many rounds bcrypt uses to salt the password.
// 10 is the standard balance between security and speed.
const BCRYPT_SALT_ROUNDS = 10;

// Projection used in every query to strip passwordHash from responses.
// MongoDB projection: 0 = exclude, 1 = include.
const OMIT_PASSWORD = { passwordHash: 0 };

// ---------------------------------------------------------------------------
// POST /api/users/login — verify username + password, return user (no hash)
// Must be declared before /:id so Express doesn't treat "login" as an id.
// Expects: { username, password }
// ---------------------------------------------------------------------------
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "username and password are required" });
    }

    // Fetch the full document including passwordHash so we can compare
    const user = await getDB().collection("users").findOne({ username });
    if (!user) return res.status(401).json({ error: "Invalid username or password" });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ error: "Invalid username or password" });

    // Return the user without the hash
    const { passwordHash: _removed, ...safeUser } = user;
    res.status(200).json(safeUser);
  } catch (err) {
    console.error("POST /api/users/login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/users — return all users (no passwords)
// ---------------------------------------------------------------------------
router.get("/", async (req, res) => {
  try {
    const users = await getDB()
      .collection("users")
      .find({}, { projection: OMIT_PASSWORD })
      .toArray();

    res.status(200).json(users);
  } catch (err) {
    console.error("GET /api/users error:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/users/:id — return one user by MongoDB _id
// ---------------------------------------------------------------------------
router.get("/:id", async (req, res) => {
  try {
    const user = await getDB()
      .collection("users")
      .findOne(
        { _id: new ObjectId(req.params.id) },
        { projection: OMIT_PASSWORD }
      );

    if (!user) return res.status(404).json({ error: "User not found" });

    res.status(200).json(user);
  } catch (err) {
    console.error("GET /api/users/:id error:", err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/users — create a new user
// Expects: { username, password, firstName, lastName, conditions? }
// ---------------------------------------------------------------------------
router.post("/", async (req, res) => {
  try {
    const { username, password, firstName, lastName, conditions } = req.body;

    // Basic validation — these fields are required
    if (!username || !password || !firstName || !lastName) {
      return res
        .status(400)
        .json({ error: "username, password, firstName, and lastName are required" });
    }

    // Hash the plaintext password before storing
    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    const newUser = {
      username,
      passwordHash,
      firstName,
      lastName,
      conditions: conditions || [],       // array of condition slugs
      customConditions: [],               // user-defined conditions start empty
      createdAt: new Date(),
      updatedAt: null,
    };

    const result = await getDB().collection("users").insertOne(newUser);

    // Return the new user without the passwordHash
    const { passwordHash: _removed, ...safeUser } = newUser;
    res.status(201).json({ _id: result.insertedId, ...safeUser });
  } catch (err) {
    // Duplicate username triggers a MongoDB error code 11000
    if (err.code === 11000) {
      return res.status(400).json({ error: "Username already taken" });
    }
    console.error("POST /api/users error:", err);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/users/:id — update user fields (not password — that's separate)
// ---------------------------------------------------------------------------
router.put("/:id", async (req, res) => {
  try {
    // Strip out fields the client should never be able to set directly
    const { passwordHash, _id, createdAt, ...updates } = req.body;

    const result = await getDB()
      .collection("users")
      .findOneAndUpdate(
        { _id: new ObjectId(req.params.id) },
        { $set: { ...updates, updatedAt: new Date() } },
        // returnDocument: "after" returns the updated doc instead of the original
        { returnDocument: "after", projection: OMIT_PASSWORD }
      );

    if (!result) return res.status(404).json({ error: "User not found" });

    res.status(200).json(result);
  } catch (err) {
    console.error("PUT /api/users/:id error:", err);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/users/:id — delete a user document
// ---------------------------------------------------------------------------
router.delete("/:id", async (req, res) => {
  try {
    const result = await getDB()
      .collection("users")
      .deleteOne({ _id: new ObjectId(req.params.id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ message: "User deleted" });
  } catch (err) {
    console.error("DELETE /api/users/:id error:", err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/users/:id/conditions — add a condition slug to conditions array
// Expects: { slug: "wheelchair" }
// Uses $addToSet so the same slug is never added twice
// ---------------------------------------------------------------------------
router.post("/:id/conditions", async (req, res) => {
  try {
    const { slug } = req.body;
    if (!slug) return res.status(400).json({ error: "slug is required" });

    const result = await getDB()
      .collection("users")
      .findOneAndUpdate(
        { _id: new ObjectId(req.params.id) },
        {
          $addToSet: { conditions: slug },
          $set: { updatedAt: new Date() },
        },
        { returnDocument: "after", projection: OMIT_PASSWORD }
      );

    if (!result) return res.status(404).json({ error: "User not found" });

    res.status(200).json(result);
  } catch (err) {
    console.error("POST /api/users/:id/conditions error:", err);
    res.status(500).json({ error: "Failed to add condition" });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/users/:id/conditions/:slug — remove a condition slug
// Uses $pull to remove the matching value from the array
// ---------------------------------------------------------------------------
router.delete("/:id/conditions/:slug", async (req, res) => {
  try {
    const result = await getDB()
      .collection("users")
      .findOneAndUpdate(
        { _id: new ObjectId(req.params.id) },
        {
          $pull: { conditions: req.params.slug },
          $set: { updatedAt: new Date() },
        },
        { returnDocument: "after", projection: OMIT_PASSWORD }
      );

    if (!result) return res.status(404).json({ error: "User not found" });

    res.status(200).json(result);
  } catch (err) {
    console.error("DELETE /api/users/:id/conditions/:slug error:", err);
    res.status(500).json({ error: "Failed to remove condition" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/users/:id/custom-conditions — add a custom condition object
// Expects: { name: string, categories: [slug, ...] }
// ---------------------------------------------------------------------------
router.post("/:id/custom-conditions", async (req, res) => {
  try {
    const { name, categories } = req.body;
    if (!name || !categories) {
      return res.status(400).json({ error: "name and categories are required" });
    }

    const result = await getDB()
      .collection("users")
      .findOneAndUpdate(
        { _id: new ObjectId(req.params.id) },
        {
          $addToSet: { customConditions: { name, categories } },
          $set: { updatedAt: new Date() },
        },
        { returnDocument: "after", projection: OMIT_PASSWORD }
      );

    if (!result) return res.status(404).json({ error: "User not found" });

    res.status(200).json(result);
  } catch (err) {
    console.error("POST /api/users/:id/custom-conditions error:", err);
    res.status(500).json({ error: "Failed to add custom condition" });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/users/:id/custom-conditions/:name — remove custom condition
// $pull removes all elements from the array where name matches
// ---------------------------------------------------------------------------
router.delete("/:id/custom-conditions/:name", async (req, res) => {
  try {
    const result = await getDB()
      .collection("users")
      .findOneAndUpdate(
        { _id: new ObjectId(req.params.id) },
        {
          $pull: { customConditions: { name: req.params.name } },
          $set: { updatedAt: new Date() },
        },
        { returnDocument: "after", projection: OMIT_PASSWORD }
      );

    if (!result) return res.status(404).json({ error: "User not found" });

    res.status(200).json(result);
  } catch (err) {
    console.error("DELETE /api/users/:id/custom-conditions/:name error:", err);
    res.status(500).json({ error: "Failed to remove custom condition" });
  }
});

export default router;
