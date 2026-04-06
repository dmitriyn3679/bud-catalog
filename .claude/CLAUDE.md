# Catalog Shop — Project Context

## Overview

Web-based product catalog and ordering system replacing paper catalog lookups.
Monorepo with three workspaces: `backend/`, `client/`, `admin/`.

## Running the Project

```bash
# All three apps concurrently
npm run dev

# Individually
npm run dev:backend   # :4000
npm run dev:client    # :5173
npm run dev:admin     # :5174
```

Before first run: copy `backend/.env.example` → `backend/.env` and fill in values.

## Stack

### Backend (`backend/`)
- Node.js + Express + TypeScript
- MongoDB + Mongoose
- JWT auth: access token (15m, memory) + refresh token (30d, httpOnly cookie)
- Cloudinary v2 for product images (multer → cloudinary SDK)
- Zod for request validation
- `tsx watch` for dev, `tsc` for build

### Client & Admin (`client/`, `admin/`)
- React 19 + Vite + TypeScript
- TanStack Query v5
- React Hook Form + @hookform/resolvers + Zod
- Mantine UI v7
- Axios with interceptor for silent token refresh
- React Router v7

## Project Structure

```
catalog-shop/
├── backend/src/
│   ├── index.ts              # Express app entry, route mounting
│   ├── config/
│   │   ├── db.ts             # Mongoose connect
│   │   └── cloudinary.ts     # Cloudinary SDK config
│   ├── models/               # Mongoose schemas
│   ├── routes/               # Express routers
│   ├── controllers/          # Route handlers (thin, call services)
│   ├── services/             # Business logic
│   ├── middlewares/
│   │   └── errorHandler.ts   # AppError class + global handler
│   └── utils/
├── client/src/
│   ├── api/axios.ts          # Axios instance + refresh interceptor
│   ├── features/             # Feature-based modules
│   │   ├── auth/
│   │   ├── catalog/
│   │   ├── cart/
│   │   ├── favorites/
│   │   ├── checkout/
│   │   └── profile/
│   ├── components/           # Shared UI components
│   ├── hooks/                # Shared hooks
│   ├── types/                # Shared TypeScript types
│   └── utils/
└── admin/src/
    ├── api/axios.ts          # Same interceptor pattern, redirects to /admin/login
    └── features/
        ├── products/
        ├── orders/
        ├── brands/
        └── categories/
```

## Database Models

### User
```ts
{ email, passwordHash, name, phone, address, role: 'user' | 'admin' }
```

### Category
```ts
{ name, slug, parentId: ObjectId | null }
// parentId = null → root category
// parentId = ObjectId → subcategory
// Products attach to leaf (subcategory) level
```

### Brand
```ts
{ name, slug }
```

### Product
```ts
{
  title, description,
  price: Number,           // client price — exposed to everyone
  purchasePrice: Number,   // purchase/cost price — admin only, NEVER sent to client API
  images: [{ url, publicId }],  // Cloudinary
  categoryId: ObjectId,          // leaf category
  brandId: ObjectId,
  stock, isActive
}
```
**Security rule:** `purchasePrice` must be stripped from all public product endpoints via Mongoose `select: false` or explicit projection.

### Cart
```ts
{ userId: ObjectId, items: [{ productId, quantity }] }
// 1:1 with user, upserted on change
```

### Favorite
```ts
{ userId: ObjectId, productIds: ObjectId[] }
// 1:1 with user
```

### Order
```ts
{
  userId: ObjectId,
  items: [{
    productId,
    title,
    price,           // client price snapshot at order time
    purchasePrice,   // cost price snapshot at order time (for profit calc)
    quantity
  }],
  total: Number,     // sum of price * quantity
  status: 'pending' | 'processing' | 'delivered' | 'cancelled',
  deliveryAddress: String,
  note?: String,
  createdAt: Date
}
// profit per order = sum of (price - purchasePrice) * quantity
// purchasePrice in order items is admin-only, stripped from user-facing responses
```

## REST API

### Auth
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh         # uses httpOnly refresh cookie
POST   /api/auth/logout
PATCH  /api/auth/change-password  [auth]
```

### User
```
GET    /api/users/me     [auth]
PATCH  /api/users/me     [auth]
```

### Products
```
GET    /api/products     ?category&brand&search&page&limit
GET    /api/products/:id
POST   /api/products     [admin] multipart/form-data
PUT    /api/products/:id [admin]
DELETE /api/products/:id [admin]
POST   /api/products/:id/images         [admin] multipart
DELETE /api/products/:id/images/:pubId  [admin]
```

### Categories
```
GET    /api/categories                # returns tree [{...cat, children:[]}]
GET    /api/categories/:id/products   ?page&limit
POST   /api/categories   [admin]  { name, slug, parentId? }
PUT    /api/categories/:id [admin]
DELETE /api/categories/:id [admin]  # blocked if has children or products
```

### Brands
```
GET    /api/brands
POST   /api/brands   [admin]
PUT    /api/brands/:id [admin]
DELETE /api/brands/:id [admin]  # blocked if products reference it
```

### Cart
```
GET    /api/cart                           [auth]
POST   /api/cart/items                     [auth]  { productId, quantity }
PATCH  /api/cart/items/:productId          [auth]  { quantity }
DELETE /api/cart/items/:productId          [auth]
DELETE /api/cart                           [auth]
```

### Favorites
```
GET    /api/favorites              [auth]
POST   /api/favorites/:productId   [auth]
DELETE /api/favorites/:productId   [auth]
```

### Orders (user)
```
POST   /api/orders      [auth]  create from cart, snapshot prices
GET    /api/orders      [auth]
GET    /api/orders/:id  [auth]
```

### Admin Orders
```
GET    /api/admin/orders             ?status&page&limit
GET    /api/admin/orders/:id
PATCH  /api/admin/orders/:id/status  { status }
```

### Admin Stats
```
GET    /api/admin/stats              # global: total sold, revenue, profit, avg markup
GET    /api/admin/stats?categoryId=  # same but scoped to category (+ its subcategories)
GET    /api/admin/stats?productId=   # stats for single product
```
Response shape:
```ts
{
  totalOrders: number,
  totalUnitsSold: number,
  totalRevenue: number,   // sum of price * qty across delivered orders
  totalProfit: number,    // sum of (price - purchasePrice) * qty
  avgMarkupPercent: number  // avg ((price - purchasePrice) / purchasePrice * 100)
}
```
Stats are calculated only from orders with status `delivered`.

## Client Pages

| Route | Component |
|-------|-----------|
| `/` | Catalog grid, sidebar: category tree + brand filter + search |
| `/product/:id` | Detail: images, description, qty picker, add to cart/favorites |
| `/cart` | Cart items, qty edit, total, → Checkout |
| `/favorites` | Saved products |
| `/checkout` | Delivery form + order summary → Place Order |
| `/login` | Login |
| `/register` | Register |
| `/profile` | Tabs: Orders, Personal info, Change password |
| `/profile/orders/:id` | Order detail |

Auth: guest can browse catalog/product; cart/favorites/checkout/profile require auth → redirect `/login`.

## Admin Pages

| Route | Component |
|-------|-----------|
| `/admin/login` | Admin login (role=admin only) |
| `/admin` | Dashboard: order counts by status + global stats (revenue, profit, avg markup) |
| `/admin/products` | Product list + search; columns: title, clientPrice, purchasePrice, markup%, stock |
| `/admin/products/new` | Product form: both `price` (client) and `purchasePrice` fields |
| `/admin/products/:id/edit` | Edit product + per-product stats (units sold, revenue, profit) |
| `/admin/orders` | All orders, filter by status |
| `/admin/orders/:id` | Order detail + status dropdown |
| `/admin/stats` | Stats page: filter by category or product; shows revenue, profit, markup |

## Code Conventions

### Backend
- Controllers are thin — delegate to services
- Services contain all business logic and DB queries
- Use `AppError` from `middlewares/errorHandler.ts` for expected errors
- Auth middleware attaches `req.user: { id, role }` to request
- All routes wrapped in `asyncHandler` (to be added in utils)
- Zod schemas defined alongside routes or in a `schemas/` subfolder

### Frontend (both client and admin)
- Feature folder structure: `features/foo/FooPage.tsx`, `useFoo.ts`, `fooApi.ts`
- API calls go in `features/foo/fooApi.ts`, use `api` from `api/axios.ts`
- Server state via TanStack Query, form state via React Hook Form
- No direct `axios` imports in components — always use the configured instance
- Access token stored in memory via `setAccessToken()` in `api/axios.ts`

## Implementation Phases

- [x] Phase 0 — Scaffold (done)
- [ ] Phase 1 — Backend: Auth (User model, JWT, auth routes)
- [ ] Phase 2 — Backend: Catalog (Brand, Category, Product + Cloudinary)
- [ ] Phase 3 — Backend: Cart, Favorites, Orders
- [ ] Phase 4 — Client: Auth + Catalog pages
- [ ] Phase 5 — Client: Cart, Favorites, Checkout, Profile
- [ ] Phase 6 — Admin Panel
