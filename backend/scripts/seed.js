/**
 * scripts/seed.js
 *
 * Seeds the Hazard-Hound database with the 9 navbar categories and conditions.
 * Run with: npm run seed
 *
 * Safe to re-run — uses upsert so existing docs are updated, not duplicated.
 * Also deletes any old categories not in the 9-slug set.
 */

import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = "Hazard-Hound";

// ---------------------------------------------------------------------------
// The 9 categories shown on the navbar filter bar
// Slugs match the keys in frontend/src/constants.js CATS object
// ---------------------------------------------------------------------------

const categories = [
  { slug: "hazard",           label: "Hazard" },
  { slug: "Unsanitary",       label: "Unsanitary" },
  { slug: "Poor_Air_Quality", label: "Poor Air Quality" },
  { slug: "info",             label: "Info" },
  { slug: "Blocked_Pathway",  label: "Blocked Pathway" },
  { slug: "Broken_equipment", label: "Broken Equipment" },
  { slug: "Unsafe_area",      label: "Unsafe Area" },
  { slug: "crime",            label: "Crime" },
  { slug: "traffic",          label: "Traffic" },
];

const VALID_SLUGS = categories.map(c => c.slug);

// ---------------------------------------------------------------------------
// Conditions — activates arrays trimmed to only the 9 valid slugs
// ---------------------------------------------------------------------------

const conditions = [
  {
    label: "Wheelchair User", slug: "wheelchair",
    activates: ["Blocked_Pathway", "Blocked_Pathway", "hazard"],
  },
  {
    label: "Cane or Walker User", slug: "cane-walker",
    activates: ["hazard", "Unsafe_area"],
  },
  {
    label: "Prosthetic Limb", slug: "prosthetic-limb",
    activates: ["hazard", "Unsafe_area"],
  },
  {
    label: "Visual Impairment", slug: "visual-impairment",
    activates: ["Poor_Air_Quality", "Unsafe_area", "hazard"],
  },
  {
    label: "Blind", slug: "blind",
    activates: ["Unsafe_area", "Blocked_Pathway", "hazard"],
  },
  {
    label: "Hearing Impairment", slug: "hearing-impairment",
    activates: ["info", "Unsafe_area"],
  },
  {
    label: "Deaf", slug: "deaf",
    activates: ["info", "Unsafe_area"],
  },
  {
    label: "Asthma", slug: "asthma",
    activates: ["Poor_Air_Quality", "Unsanitary", "hazard"],
  },
  {
    label: "COPD", slug: "copd",
    activates: ["Poor_Air_Quality", "Unsanitary", "hazard"],
  },
  {
    label: "Epilepsy", slug: "epilepsy",
    activates: ["hazard", "Unsafe_area"],
  },
  {
    label: "Photosensitivity", slug: "photosensitivity",
    activates: ["hazard", "Unsafe_area"],
  },
  {
    label: "Immunocompromised", slug: "immunocompromised",
    activates: ["Unsanitary", "Poor_Air_Quality", "hazard"],
  },
  {
    label: "Chronic Pain", slug: "chronic-pain",
    activates: ["hazard", "Blocked_Pathway", "Unsafe_area"],
  },
  {
    label: "Chronic Fatigue", slug: "chronic-fatigue",
    activates: ["hazard", "Blocked_Pathway"],
  },
  {
    label: "Multiple Sclerosis", slug: "multiple-sclerosis",
    activates: ["hazard", "Unsafe_area", "Blocked_Pathway"],
  },
  {
    label: "Cerebral Palsy", slug: "cerebral-palsy",
    activates: ["hazard", "Blocked_Pathway", "Unsafe_area"],
  },
  {
    label: "Autism Spectrum", slug: "autism-spectrum",
    activates: ["Unsafe_area", "Poor_Air_Quality", "hazard"],
  },
  {
    label: "Sensory Processing Disorder", slug: "sensory-processing",
    activates: ["Unsafe_area", "Poor_Air_Quality", "hazard"],
  },
  {
    label: "PTSD", slug: "ptsd",
    activates: ["Unsafe_area", "crime", "hazard"],
  },
  {
    label: "Vertigo", slug: "vertigo",
    activates: ["hazard", "Unsafe_area"],
  },
  {
    label: "Heart Condition", slug: "heart-condition",
    activates: ["hazard", "Unsafe_area", "Poor_Air_Quality"],
  },
  {
    label: "Diabetes", slug: "diabetes",
    activates: ["hazard", "Unsafe_area"],
  },
  {
    label: "Elderly Mobility", slug: "elderly-mobility",
    activates: ["hazard", "Blocked_Pathway", "Unsafe_area"],
  },
  {
    label: "Pregnancy", slug: "pregnancy",
    activates: ["hazard", "Unsanitary", "Poor_Air_Quality"],
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

    // Remove any categories not in the 9-slug set
    const deleted = await db.collection("categories").deleteMany({ slug: { $nin: VALID_SLUGS } });
    console.log(`Removed ${deleted.deletedCount} old categories`);

    // Upsert each of the 9 categories
    for (const c of categories) {
      await db.collection("categories").updateOne(
        { slug: c.slug },
        { $set: c },
        { upsert: true }
      );
    }
    console.log(`Categories: upserted ${categories.length} documents`);

    // Upsert conditions
    for (const c of conditions) {
      await db.collection("conditions").updateOne(
        { slug: c.slug },
        { $set: c },
        { upsert: true }
      );
    }
    console.log(`Conditions: upserted ${conditions.length} documents`);

    console.log("\nSeed complete.");
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seed();
