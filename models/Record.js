import mongoose, { Schema } from "mongoose";
import { randomUUID } from "crypto";

const RecordSchema = new Schema(
  {
    recordId: {
      type: String,
      required: true,
      index: true,
      default: () => randomUUID()
    },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    username: { type: String, required: true },
    values: { type: Schema.Types.Mixed, default: {} },
    adminRemark: { type: String, default: "" }
  },
  { timestamps: true }
);

export default mongoose.models.Record || mongoose.model("Record", RecordSchema);
