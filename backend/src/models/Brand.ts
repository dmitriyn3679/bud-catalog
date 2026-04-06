import mongoose, { Schema, Document } from 'mongoose';

export interface IBrand extends Document {
  name: string;
  slug: string;
}

const brandSchema = new Schema<IBrand>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  },
  { timestamps: true },
);

export const Brand = mongoose.model<IBrand>('Brand', brandSchema);
