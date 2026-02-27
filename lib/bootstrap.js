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

  const hasAdmin = await User.findOne({ role: "admin" }).lean();
  if (!hasAdmin) {
    const passwordHash = await bcrypt.hash("sharan123@S", 10);
    await User.create({
      username: "sharan",
      passwordHash,
      role: "admin",
      forcePasswordReset: true
    });
  }

  const config = await SchemaConfig.findOne({ key: "default" }).lean();
  if (!config) {
    await SchemaConfig.create({ key: "default", fields: defaultFields });
  }
}

