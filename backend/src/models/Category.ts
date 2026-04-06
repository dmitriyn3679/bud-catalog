import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  slug: string;
  parentId: Types.ObjectId | null;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
  },
  { timestamps: true },
);

export const Category = mongoose.model<ICategory>('Category', categorySchema);
