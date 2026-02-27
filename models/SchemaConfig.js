import mongoose, { Schema } from "mongoose";

const FieldSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    type: { type: String, enum: ["string", "number", "boolean", "date"], required: true },
    required: { type: Boolean, default: false }
  },
  { _id: false }
);

const SchemaConfigSchema = new Schema(
  {
    key: { type: String, default: "default", unique: true },
    fields: { type: [FieldSchema], default: [] }
  },
  { timestamps: true }
);

export default mongoose.models.SchemaConfig || mongoose.model("SchemaConfig", SchemaConfigSchema);

