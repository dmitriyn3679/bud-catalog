export interface User {
  _id: string;
  email?: string;
  name: string;
  shopName: string;
  city: string;
  address: string;
  phone?: string;
  role: 'user' | 'admin';
  isBlocked?: boolean;
}

export interface ProductImage {
  url: string;
  publicId: string;
}

export interface CategoryRef {
  _id: string;
  name: string;
  slug: string;
}

export interface BrandRef {
  _id: string;
  name: string;
  slug: string;
}

export interface Product {
  _id: string;
  sku: string;
  title: string;
  description: string;
  price: number;
  images: ProductImage[];
  categoryId: CategoryRef;
  brandId: BrandRef;
  stock: number;
  isActive: boolean;
  isPromo: boolean;
  unlimitedStock: boolean;
  hidePrice: boolean;
  createdAt: string;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children: Category[];
}

export interface Brand {
  _id: string;
  name: string;
  slug: string;
}

export interface CartItem {
  productId: Product;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
}

export type OrderItemChangeType = 'modified' | 'removed' | 'added';

export interface OrderItem {
  productId: string;
  title: string;
  sku?: string;
  price: number;
  hidePrice?: boolean;
  quantity: number;
  originalQuantity?: number;
  changeType?: OrderItemChangeType;
}

export interface Order {
  _id: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'processing' | 'delivered' | 'cancelled';
  isPaid: boolean;
  deliveryAddress: string;
  note?: string;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
