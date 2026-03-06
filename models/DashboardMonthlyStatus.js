import mongoose, { Schema } from "mongoose";

const DashboardStatusRowSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    username: { type: String, required: true, trim: true },
    schedule: { type: Number, default: 0 },
    jd: { type: Number, default: 0 },
    closures: { type: Number, default: 0 }
  },
  { _id: false }
);

const DashboardMonthlyStatusSchema = new Schema(
  {
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    rows: { type: [DashboardStatusRowSchema], default: [] }
  },
  { timestamps: true }
);

DashboardMonthlyStatusSchema.index({ month: 1, year: 1 }, { unique: true });

export default mongoose.models.DashboardMonthlyStatus ||
  mongoose.model("DashboardMonthlyStatus", DashboardMonthlyStatusSchema);
