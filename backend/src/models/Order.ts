import mongoose, { Schema, Document, Types } from 'mongoose';

export const ORDER_STATUSES = ['pending', 'processing', 'delivered', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type OrderItemChangeType = 'modified' | 'removed' | 'added';

export interface IOrderItem {
  productId: Types.ObjectId;
  title: string;
  sku?: string;
  price: number;
  purchasePrice: number;
  actualPurchasePrice?: number;
  hidePrice?: boolean;
  quantity: number;
  originalQuantity?: number;
  changeType?: OrderItemChangeType;
}

export interface IOrder extends Document {
  userId: Types.ObjectId;
  items: IOrderItem[];
  total: number;
  status: OrderStatus;
  isPaid: boolean;
  deliveryAddress: string;
  note?: string;
}

const orderSchema = new Schema<IOrder>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: [
      {
        productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        title: { type: String, required: true },
        sku: { type: String },
        price: { type: Number, required: true },
        purchasePrice: { type: Number, required: true },
        actualPurchasePrice: { type: Number, min: 0 },
        hidePrice: { type: Boolean, default: false },
        quantity: { type: Number, required: true, min: 1 },
        originalQuantity: { type: Number },
        changeType: { type: String, enum: ['modified', 'removed', 'added'] },
      },
    ],
    total: { type: Number, required: true },
    status: { type: String, enum: ORDER_STATUSES, default: 'pending' },
    isPaid: { type: Boolean, default: false },
    deliveryAddress: { type: String, required: true, trim: true },
    note: { type: String, trim: true },
  },
  { timestamps: true },
);

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

export const Order = mongoose.model<IOrder>('Order', orderSchema);
