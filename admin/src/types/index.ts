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
  sku: string;
  title: string;
  description: string;
  price: number;
  purchasePrice: number;
  images: ProductImage[];
  categoryId: CategoryRef;
  brandId: BrandRef;
  stock: number;
  isActive: boolean;
  isPromo: boolean;
  unlimitedStock: boolean;
  hidePrice: boolean;
  orderCount: number;
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

export type OrderItemChangeType = 'modified' | 'removed' | 'added';

export interface OrderItem {
  productId: string;
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

export interface AdminOrder {
  _id: string;
  userId: { _id: string; name: string; email: string; phone?: string };
  items: OrderItem[];
  total: number;
  status: 'pending' | 'processing' | 'delivered' | 'cancelled';
  isPaid: boolean;
  deliveryAddress: string;
  note?: string;
  createdAt: string;
}

export interface Stats {
  totalOrders: number;
  totalUnitsSold: number;
  totalRevenue: number;
  totalCost: number;
  totalExpenses: number;
  totalProfit: number;
  avgMarkupPercent: number;
}

export type ExpenseCategory = 'rent' | 'salary' | 'utilities' | 'marketing' | 'logistics' | 'other';

export interface Expense {
  _id: string;
  amount: number;
  description: string;
  category: ExpenseCategory;
  date: string;
  createdAt: string;
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
  isSystemRetail?: boolean;
  isBlocked?: boolean;
  createdAt: string;
  stats: {
    orderCount: number;
    totalAmount: number;
    avgMarkupPercent: number | null;
  };
}

export interface RetailUser {
  _id: string;
  name: string;
  isSystemRetail: boolean;
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
