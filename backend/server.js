/**
 * server.js
 *
 * Entry point for the Hazard-Hound Express server.
 * Responsibilities:
 *   - Load environment variables from .env
 *   - Connect to MongoDB
 *   - Register JSON middleware
 *   - Mount all API route handlers
 *   - Start listening on the configured PORT
 */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./db.js";

// Route modules
import userRoutes from "./routes/users.js";
import reportRoutes from "./routes/hazard_reports.js";
import notificationRoutes from "./routes/notifications.js";
import conditionRoutes from "./routes/conditions.js";
import categoryRoutes from "./routes/categories.js";

// Load .env variables before anything else
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Allow requests from the Vite dev server (port 5173) and production frontend
app.use(cors({ origin: ["http://localhost:5173", "http://localhost:4173"] }));

// Parse incoming JSON request bodies
app.use(express.json());

// Mount route handlers under their respective prefixes
app.use("/api/users", userRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/conditions", conditionRoutes);
app.use("/api/categories", categoryRoutes);

// Connect to MongoDB, then start the server.
// If the database connection fails, we log the error and exit —
// there is no point running without a database.
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Hazard-Hound server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  });
