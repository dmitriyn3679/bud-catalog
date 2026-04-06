export interface User {
  _id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
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

export interface AdminProduct {
  _id: string;
  title: string;
  description: string;
  price: number;
  purchasePrice: number;
  images: ProductImage[];
  categoryId: CategoryRef;
  brandId: BrandRef;
  stock: number;
  isActive: boolean;
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

export interface OrderItem {
  productId: string;
  title: string;
  price: number;
  purchasePrice: number;
  quantity: number;
}

export interface AdminOrder {
  _id: string;
  userId: { _id: string; name: string; email: string; phone?: string };
  items: OrderItem[];
  total: number;
  status: 'pending' | 'processing' | 'delivered' | 'cancelled';
  deliveryAddress: string;
  note?: string;
  createdAt: string;
}

export interface Stats {
  totalOrders: number;
  totalUnitsSold: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  avgMarkupPercent: number;
}

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  shopName: string;
  city: string;
  address: string;
  phone?: string;
  globalMarkupPercent?: number;
  createdAt: string;
}

export interface UserMarkup {
  _id: string;
  categoryId: CategoryRef;
  markupPercent: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
