import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IProductImage {
  url: string;
  publicId: string;
}

export interface IProduct extends Document {
  sku: string;
  title: string;
  description: string;
  price: number;
  purchasePrice: number;
  images: IProductImage[];
  categoryId: Types.ObjectId;
  brandId: Types.ObjectId;
  stock: number;
  isActive: boolean;
  isPromo: boolean;
  unlimitedStock: boolean;
  hidePrice: boolean;
}

const productSchema = new Schema<IProduct>(
  {
    sku: { type: String, trim: true, default: '' },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    purchasePrice: { type: Number, required: true, min: 0, select: false },
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
      },
    ],
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    brandId: { type: Schema.Types.ObjectId, ref: 'Brand', required: true },
    stock: { type: Number, required: true, min: 0, default: 0 },
    isActive: { type: Boolean, default: true },
    isPromo: { type: Boolean, default: false },
    unlimitedStock: { type: Boolean, default: false },
    hidePrice: { type: Boolean, default: false },
  },
  { timestamps: true },
);

productSchema.index({ title: 1 });
productSchema.index({ categoryId: 1 });
productSchema.index({ brandId: 1 });
productSchema.index({ isActive: 1, price: 1 });
productSchema.index({ isActive: 1, isPromo: -1, createdAt: -1 });

export const Product = mongoose.model<IProduct>('Product', productSchema);
