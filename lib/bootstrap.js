import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";
import SchemaConfig from "@/models/SchemaConfig";

const defaultFields = [
  { name: "title", label: "Title", type: "string", required: true },
  { name: "amount", label: "Amount", type: "number", required: false },
  { name: "active", label: "Active", type: "boolean", required: false },
  { name: "entryDate", label: "Entry Date", type: "date", required: false }
];

export async function ensureBootstrapData() {
  await dbConnect();

  const passwordHash = await bcrypt.hash("sharan123@S", 10);
  await User.updateOne(
    { username: "sharan" },
    {
      $setOnInsert: {
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
    {
      $setOnInsert: {
        key: "default",
        fields: defaultFields
      }
    },
    { upsert: true }
  );
}

