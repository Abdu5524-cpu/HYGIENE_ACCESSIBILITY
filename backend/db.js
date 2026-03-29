/**
 * db.js
 *
 * Manages the MongoDB connection for the Hazard-Hound app.
 * Exports two functions:
 *   - connectDB(): opens the connection (call once on server startup)
 *   - getDB(): returns the connected database instance for use in routes
 *
 * The connection is kept in module-level variables so it is reused
 * across all route files (module caching means this file runs once).
 */

import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = "Hazard-Hound";

// These are module-level — shared across every file that imports db.js
let client;
let db;

/**
 * connectDB
 * Opens a connection to MongoDB Atlas and stores the client + db instance.
 * Should be called once when the server starts (in server.js).
 */
export async function connectDB() {
  client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db(DB_NAME);
  console.log(`Connected to MongoDB — database: ${DB_NAME}`);
}

/**
 * getDB
 * Returns the active database instance.
 * Call this inside route handlers to get a collection, e.g.:
 *   const reports = getDB().collection("hazard_reports");
 */
export function getDB() {
  if (!db) {
    throw new Error("Database not connected. Call connectDB() first.");
  }
  return db;
}
