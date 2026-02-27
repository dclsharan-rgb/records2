import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

function loadEnvFile() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx < 1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "user"], default: "user" },
    forcePasswordReset: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const FieldSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    type: { type: String, enum: ["string", "number", "boolean", "date"], required: true },
    required: { type: Boolean, default: false }
  },
  { _id: false }
);

const SchemaConfigSchema = new mongoose.Schema(
  {
    key: { type: String, default: "default", unique: true },
    fields: { type: [FieldSchema], default: [] }
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);
const SchemaConfig = mongoose.models.SchemaConfig || mongoose.model("SchemaConfig", SchemaConfigSchema);

const defaultFields = [
  { name: "title", label: "Title", type: "string", required: true },
  { name: "amount", label: "Amount", type: "number", required: false },
  { name: "active", label: "Active", type: "boolean", required: false },
  { name: "entryDate", label: "Entry Date", type: "date", required: false }
];

async function run() {
  loadEnvFile();
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI not found. Put it in .env or environment.");
  }

  await mongoose.connect(mongoUri, { bufferCommands: false });

  const passwordHash = await bcrypt.hash("sharan123@S", 10);
  await User.updateOne(
    { username: "sharan" },
    {
      $set: {
        username: "sharan",
        passwordHash,
        role: "admin",
        forcePasswordReset: true
      }
    },
    { upsert: true }
  );

  await SchemaConfig.updateOne(
    { key: "default" },
    { $set: { key: "default", fields: defaultFields } },
    { upsert: true }
  );

  console.log("Seed complete: admin user + default schema ready.");
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error("Seed failed:", error.message);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});

