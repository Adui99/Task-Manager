import mongoose, { Schema, Document } from "mongoose";

export interface ITask extends Document {
  title: string;
  description?: string;
  assignees: mongoose.Types.ObjectId[];
  status: "todo" | "in-progress" | "done";
  priority: "low" | "medium" | "high";
  deadline?: Date;
  order: number;
  progress: number;
  archived: boolean;
  adminNotifiedOverdue: boolean;
  comments: {
    user_id: mongoose.Types.ObjectId;
    content: string;
    createdAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    assignee_id: { type: Schema.Types.ObjectId, ref: "User" }, // Keeping for migration
    assignees: [{ type: Schema.Types.ObjectId, ref: "User" }],
    status: { type: String, enum: ["todo", "in-progress", "done"], default: "todo" },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    deadline: { type: Date },
    order: { type: Number, default: 0 },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    archived: { type: Boolean, default: false },
    adminNotifiedOverdue: { type: Boolean, default: false },
    comments: [{
      user_id: { type: Schema.Types.ObjectId, ref: "User" },
      content: { type: String, required: true },
      createdAt: { type: Date, default: Date.now }
    }]
  },
  { timestamps: true }
);
if (mongoose.models.Task) {
  delete mongoose.models.Task;
}

export default mongoose.model<ITask>("Task", TaskSchema);
