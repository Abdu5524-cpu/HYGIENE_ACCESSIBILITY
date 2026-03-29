/**
 * scripts/seed.js
 *
 * Seeds the Hazard-Hound database with initial categories and conditions data.
 * Run this once on a fresh environment with: npm run seed
 *
 * NOTE: The production database has already been seeded.
 * This script is safe to run again — it uses insertMany with ordered: false,
 * which means duplicate slug errors are silently skipped rather than throwing.
 * Only genuinely new documents will be inserted.
 */

import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = "Hazard-Hound";

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const categories = [
  { label: "Uneven Ground", slug: "uneven-ground" },
  { label: "Steep Incline", slug: "steep-incline" },
  { label: "Flooded Path", slug: "flooded-path" },
  { label: "Narrow Passage", slug: "narrow-passage" },
  { label: "Missing Ramp", slug: "missing-ramp" },
  { label: "Broken Elevator", slug: "broken-elevator" },
  { label: "Blocked Path", slug: "blocked-path" },
  { label: "Poor Lighting", slug: "poor-lighting" },
  { label: "Exposed Wiring", slug: "exposed-wiring" },
  { label: "Construction Zone", slug: "construction-zone" },
  { label: "Unsanitary Surface", slug: "unsanitary-surface" },
  { label: "Biohazard", slug: "biohazard" },
  { label: "Mold", slug: "mold" },
  { label: "Sewage", slug: "sewage" },
  { label: "Poor Ventilation", slug: "poor-ventilation" },
  { label: "Smoke", slug: "smoke" },
  { label: "Chemical Smell", slug: "chemical-smell" },
  { label: "Excessive Noise", slug: "excessive-noise" },
  { label: "Bright Lights", slug: "bright-lights" },
  { label: "Crowding", slug: "crowding" },
  { label: "Aggressive Animal", slug: "aggressive-animal" },
  { label: "Unsafe Structure", slug: "unsafe-structure" },
  { label: "Broken Glass", slug: "broken-glass" },
  { label: "Ice or Snow", slug: "ice-or-snow" },
  { label: "Standing Water", slug: "standing-water" },
  { label: "Missing Signage", slug: "missing-signage" },
  { label: "No Seating Available", slug: "no-seating" },
  { label: "No Shade", slug: "no-shade" },
  { label: "Extreme Heat", slug: "extreme-heat" },
  { label: "Extreme Cold", slug: "extreme-cold" },
  { label: "Strong Odor", slug: "strong-odor" },
  { label: "Pest Infestation", slug: "pest-infestation" },
  { label: "Loose Gravel", slug: "loose-gravel" },
  { label: "Slippery Surface", slug: "slippery-surface" },
  { label: "Low Ceiling", slug: "low-ceiling" },
  { label: "No Handrail", slug: "no-handrail" },
  { label: "Broken Pavement", slug: "broken-pavement" },
  { label: "Deep Pothole", slug: "deep-pothole" },
  { label: "Overgrown Vegetation", slug: "overgrown-vegetation" },
  { label: "Falling Debris", slug: "falling-debris" },
  { label: "Unstable Ground", slug: "unstable-ground" },
  { label: "No Accessible Bathroom", slug: "no-accessible-bathroom" },
  { label: "Unsanitary Bathroom", slug: "unsanitary-bathroom" },
  { label: "No Drinking Water", slug: "no-drinking-water" },
  { label: "Contaminated Water", slug: "contaminated-water" },
  { label: "High Pollen", slug: "high-pollen" },
  { label: "Dust or Particulates", slug: "dust-particulates" },
  { label: "Strong Wind", slug: "strong-wind" },
  { label: "Loud Traffic", slug: "loud-traffic" },
  { label: "Vibration", slug: "vibration" },
  { label: "Flickering Lights", slug: "flickering-lights" },
  { label: "Strobing Lights", slug: "strobing-lights" },
  { label: "Strong Sun Glare", slug: "sun-glare" },
  { label: "No Tactile Paving", slug: "no-tactile-paving" },
  { label: "No Audio Signals", slug: "no-audio-signals" },
  { label: "Inaccessible Entrance", slug: "inaccessible-entrance" },
  { label: "Broken Curb Cut", slug: "broken-curb-cut" },
  { label: "Gap in Platform", slug: "gap-in-platform" },
  { label: "Narrow Doorway", slug: "narrow-doorway" },
  { label: "Heavy Door", slug: "heavy-door" },
  { label: "No Automatic Door", slug: "no-automatic-door" },
  { label: "Insufficient Rest Areas", slug: "insufficient-rest-areas" },
  { label: "Long Walking Distance", slug: "long-walking-distance" },
  { label: "No Elevator Alternative", slug: "no-elevator-alternative" },
  { label: "Aggressive People", slug: "aggressive-people" },
  { label: "Poor Cell Coverage", slug: "poor-cell-coverage" },
];

const conditions = [
  {
    label: "Wheelchair User",
    slug: "wheelchair",
    activates: [
      "missing-ramp", "broken-elevator", "narrow-passage", "blocked-path",
      "uneven-ground", "steep-incline", "broken-curb-cut", "gap-in-platform",
      "narrow-doorway", "heavy-door", "no-automatic-door", "no-elevator-alternative",
      "flooded-path", "loose-gravel", "slippery-surface", "unstable-ground",
      "inaccessible-entrance",
    ],
  },
  {
    label: "Cane or Walker User",
    slug: "cane-walker",
    activates: [
      "uneven-ground", "steep-incline", "slippery-surface", "ice-or-snow",
      "loose-gravel", "broken-pavement", "deep-pothole", "flooded-path",
      "no-handrail", "blocked-path", "unstable-ground", "standing-water",
    ],
  },
  {
    label: "Prosthetic Limb",
    slug: "prosthetic-limb",
    activates: [
      "uneven-ground", "slippery-surface", "ice-or-snow", "loose-gravel",
      "steep-incline", "broken-pavement", "deep-pothole", "unstable-ground",
      "no-handrail",
    ],
  },
  {
    label: "Visual Impairment",
    slug: "visual-impairment",
    activates: [
      "poor-lighting", "missing-signage", "no-tactile-paving", "no-audio-signals",
      "blocked-path", "construction-zone", "broken-glass", "exposed-wiring",
      "uneven-ground", "deep-pothole", "sun-glare",
    ],
  },
  {
    label: "Blind",
    slug: "blind",
    activates: [
      "poor-lighting", "missing-signage", "no-tactile-paving", "no-audio-signals",
      "blocked-path", "construction-zone", "broken-glass", "exposed-wiring",
      "uneven-ground", "deep-pothole", "narrow-passage", "inaccessible-entrance",
    ],
  },
  {
    label: "Hearing Impairment",
    slug: "hearing-impairment",
    activates: [
      "no-audio-signals", "missing-signage", "construction-zone", "poor-cell-coverage",
    ],
  },
  {
    label: "Deaf",
    slug: "deaf",
    activates: [
      "no-audio-signals", "missing-signage", "construction-zone", "poor-cell-coverage",
    ],
  },
  {
    label: "Asthma",
    slug: "asthma",
    activates: [
      "smoke", "chemical-smell", "poor-ventilation", "dust-particulates",
      "high-pollen", "mold", "strong-odor", "extreme-heat", "extreme-cold",
    ],
  },
  {
    label: "COPD",
    slug: "copd",
    activates: [
      "smoke", "chemical-smell", "poor-ventilation", "dust-particulates",
      "high-pollen", "mold", "strong-odor", "extreme-heat", "extreme-cold",
      "strong-wind",
    ],
  },
  {
    label: "Epilepsy",
    slug: "epilepsy",
    activates: [
      "strobing-lights", "flickering-lights", "excessive-noise",
      "construction-zone", "crowding",
    ],
  },
  {
    label: "Photosensitivity",
    slug: "photosensitivity",
    activates: ["strobing-lights", "flickering-lights", "bright-lights", "sun-glare"],
  },
  {
    label: "Immunocompromised",
    slug: "immunocompromised",
    activates: [
      "biohazard", "unsanitary-surface", "unsanitary-bathroom", "mold",
      "sewage", "contaminated-water", "pest-infestation", "no-drinking-water",
      "standing-water",
    ],
  },
  {
    label: "Chronic Pain",
    slug: "chronic-pain",
    activates: [
      "uneven-ground", "steep-incline", "long-walking-distance",
      "insufficient-rest-areas", "no-seating", "construction-zone",
      "blocked-path", "broken-pavement",
    ],
  },
  {
    label: "Chronic Fatigue",
    slug: "chronic-fatigue",
    activates: [
      "long-walking-distance", "insufficient-rest-areas", "no-seating",
      "steep-incline", "broken-elevator", "no-elevator-alternative",
      "extreme-heat", "extreme-cold",
    ],
  },
  {
    label: "Multiple Sclerosis",
    slug: "multiple-sclerosis",
    activates: [
      "extreme-heat", "uneven-ground", "steep-incline", "slippery-surface",
      "long-walking-distance", "insufficient-rest-areas", "no-seating",
      "broken-elevator", "no-elevator-alternative",
    ],
  },
  {
    label: "Cerebral Palsy",
    slug: "cerebral-palsy",
    activates: [
      "uneven-ground", "steep-incline", "slippery-surface", "narrow-passage",
      "missing-ramp", "broken-elevator", "no-handrail", "blocked-path",
      "inaccessible-entrance", "heavy-door",
    ],
  },
  {
    label: "Autism Spectrum",
    slug: "autism-spectrum",
    activates: [
      "excessive-noise", "crowding", "bright-lights", "strobing-lights",
      "flickering-lights", "strong-odor", "construction-zone", "vibration",
    ],
  },
  {
    label: "Sensory Processing Disorder",
    slug: "sensory-processing",
    activates: [
      "excessive-noise", "bright-lights", "strobing-lights", "flickering-lights",
      "strong-odor", "crowding", "vibration", "loud-traffic",
    ],
  },
  {
    label: "PTSD",
    slug: "ptsd",
    activates: [
      "excessive-noise", "crowding", "aggressive-people", "construction-zone",
      "loud-traffic", "poor-lighting",
    ],
  },
  {
    label: "Vertigo",
    slug: "vertigo",
    activates: [
      "steep-incline", "uneven-ground", "flickering-lights", "strobing-lights",
      "construction-zone", "unstable-ground",
    ],
  },
  {
    label: "Heart Condition",
    slug: "heart-condition",
    activates: [
      "steep-incline", "extreme-heat", "extreme-cold", "long-walking-distance",
      "construction-zone", "excessive-noise", "broken-elevator",
      "no-elevator-alternative",
    ],
  },
  {
    label: "Diabetes",
    slug: "diabetes",
    activates: [
      "extreme-heat", "extreme-cold", "long-walking-distance",
      "insufficient-rest-areas", "no-seating", "no-drinking-water",
    ],
  },
  {
    label: "Elderly Mobility",
    slug: "elderly-mobility",
    activates: [
      "uneven-ground", "steep-incline", "slippery-surface", "ice-or-snow",
      "no-handrail", "poor-lighting", "long-walking-distance",
      "insufficient-rest-areas", "no-seating", "broken-elevator",
      "no-elevator-alternative", "heavy-door",
    ],
  },
  {
    label: "Pregnancy",
    slug: "pregnancy",
    activates: [
      "steep-incline", "uneven-ground", "slippery-surface", "extreme-heat",
      "poor-ventilation", "chemical-smell", "smoke", "no-seating",
      "insufficient-rest-areas", "crowding", "no-accessible-bathroom",
    ],
  },
];

// ---------------------------------------------------------------------------
// Run seed
// ---------------------------------------------------------------------------

async function seed() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log(`Connected to MongoDB — seeding database: ${DB_NAME}`);

    const db = client.db(DB_NAME);

    // ordered: false means MongoDB continues inserting after a duplicate key error.
    // Any document whose slug already exists is skipped; new ones are inserted.
    const catResult = await db
      .collection("categories")
      .insertMany(categories, { ordered: false })
      .catch((err) => {
        // BulkWriteError with code 11000 means some duplicates were skipped — that's fine
        if (err.code === 11000 || err.writeErrors) {
          return err.result || { insertedCount: err.result?.nInserted ?? 0 };
        }
        throw err;
      });

    console.log(`Categories: inserted ${catResult.insertedCount ?? "some"} documents`);

    const condResult = await db
      .collection("conditions")
      .insertMany(conditions, { ordered: false })
      .catch((err) => {
        if (err.code === 11000 || err.writeErrors) {
          return err.result || { insertedCount: err.result?.nInserted ?? 0 };
        }
        throw err;
      });

    console.log(`Conditions: inserted ${condResult.insertedCount ?? "some"} documents`);

    console.log("\nSeed complete.");
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seed();
