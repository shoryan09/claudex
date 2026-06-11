import { Schema, model, models } from "mongoose";

const BucketSchema = new Schema({
  owner: { type: String, required: true },
  date: { type: String, required: true },
  hour: { type: Number, required: true },
  model: { type: String, required: true },
  project: { type: String, required: true },
  inTokens: Number, outTokens: Number, cacheCreate: Number, cacheRead: Number,
  messages: Number, sessions: Number,
  day: { type: Date, required: true },
  updatedAt: { type: Date, default: Date.now },
});

BucketSchema.index({ owner: 1, date: 1, hour: 1, model: 1, project: 1 }, { unique: true });
BucketSchema.index({ day: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
BucketSchema.index({ date: 1 });
BucketSchema.index({ owner: 1, date: 1 });

export const Bucket = models.Bucket || model("Bucket", BucketSchema);