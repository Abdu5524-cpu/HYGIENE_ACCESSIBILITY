/**
 * scripts/setup-db.js
 *
 * Creates MongoDB indexes for the Hazard-Hound database.
 * Run this once on a fresh environment with: npm run setup-db
 *
 * The production database has already been indexed.
 * This script exists so new environments (local dev, CI, new servers)
 * can be set up quickly without manual Atlas configuration.
 *
 * Indexes created:
 *   - categories.slug         (unique)
 *   - conditions.slug         (unique)
 *   - users.username          (unique)
 *   - hazard_reports.location (2dsphere — required for geo queries)
 *   - hazard_reports.categories
 *   - notifications.userId
 *   - notifications.reportId
 */

import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = "Hazard-Hound";

async function setupDB() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log(`Connected to MongoDB — setting up indexes for: ${DB_NAME}`);

    const db = client.db(DB_NAME);

    // --- categories ---
    // slug must be unique so we don't end up with duplicate category entries
    await db.collection("categories").createIndex(
      { slug: 1 },
      { unique: true }
    );
    console.log("Index created: categories.slug (unique)");

    // --- conditions ---
    await db.collection("conditions").createIndex(
      { slug: 1 },
      { unique: true }
    );
    console.log("Index created: conditions.slug (unique)");

    // --- users ---
    // Unique username enforced at the database level (belt-and-suspenders with app validation)
    await db.collection("users").createIndex(
      { username: 1 },
      { unique: true }
    );
    console.log("Index created: users.username (unique)");

    // --- hazard_reports ---
    // 2dsphere index enables $nearSphere and other geospatial operators
    await db.collection("hazard_reports").createIndex(
      { location: "2dsphere" }
    );
    console.log("Index created: hazard_reports.location (2dsphere)");

    // Regular index on categories for filtering reports by category slug
    await db.collection("hazard_reports").createIndex(
      { categories: 1 }
    );
    console.log("Index created: hazard_reports.categories");

    // --- notifications ---
    // These support efficient lookups by user and by report
    await db.collection("notifications").createIndex({ userId: 1 });
    console.log("Index created: notifications.userId");

    await db.collection("notifications").createIndex({ reportId: 1 });
    console.log("Index created: notifications.reportId");

    console.log("\nAll indexes created successfully.");
  } catch (err) {
    console.error("Error creating indexes:", err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

setupDB();
