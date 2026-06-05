import { Schema, model, models } from "mongoose";

const BucketSchema = new Schema({
  owner: { type: String, required: true }, // the token for now; real userId in step 6b
  date: { type: String, required: true },  // "YYYY-MM-DD"
  hour: { type: Number, required: true },
  model: { type: String, required: true },
  project: { type: String, required: true },
  inTokens: Number, outTokens: Number, cacheCreate: Number, cacheRead: Number,
  messages: Number, sessions: Number,
  day: { type: Date, required: true },     // used for TTL
  updatedAt: { type: Date, default: Date.now },
});

// one doc per (owner, date, hour, model, project) → upsert overwrites it
BucketSchema.index({ owner: 1, date: 1, hour: 1, model: 1, project: 1 }, { unique: true });
// rolling 30-day retention: Mongo deletes each doc 30 days after `day`
BucketSchema.index({ day: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const Bucket = models.Bucket || model("Bucket", BucketSchema);