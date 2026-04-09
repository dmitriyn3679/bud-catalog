import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email?: string;
  passwordHash: string;
  name: string;
  shopName: string;
  city: string;
  address: string;
  phone?: string;
  globalMarkupPercent?: number;
  role: 'user' | 'admin';
  isSystemRetail?: boolean;
  isBlocked?: boolean;
  refreshTokenHash?: string;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: false, unique: true, sparse: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true },
    shopName: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    phone: { type: String, unique: true, sparse: true, trim: true },
  globalMarkupPercent: { type: Number, min: 0 },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isSystemRetail: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
    refreshTokenHash: { type: String, select: false },
  },
  { timestamps: true },
);

export const User = mongoose.model<IUser>('User', userSchema);
