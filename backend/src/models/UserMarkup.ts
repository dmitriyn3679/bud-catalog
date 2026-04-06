import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUserMarkup extends Document {
  userId: Types.ObjectId;
  categoryId: Types.ObjectId;
  markupPercent: number;
}

const userMarkupSchema = new Schema<IUserMarkup>(
  {
    userId:        { type: Schema.Types.ObjectId, ref: 'User',     required: true },
    categoryId:    { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    markupPercent: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

userMarkupSchema.index({ userId: 1, categoryId: 1 }, { unique: true });

export const UserMarkup = mongoose.model<IUserMarkup>('UserMarkup', userMarkupSchema);
