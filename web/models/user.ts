import { Schema, model, models } from "mongoose";
import crypto from "node:crypto";

const UserSchema = new Schema({
  githubId: { type: String, required: true, unique: true },
  name: String,
  email: String,
  image: String,
  cliToken: {
    type: String, required: true, unique: true,
    default: () => "cdx_" + crypto.randomBytes(24).toString("hex"),
  },
  createdAt: { type: Date, default: Date.now },
});

export const User = models.User || model("User", UserSchema);