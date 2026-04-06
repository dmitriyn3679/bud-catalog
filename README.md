# Catalog Shop

Web-based product catalog and ordering system.

## Structure

```
catalog-shop/
├── backend/    # Node.js + Express + MongoDB REST API
├── client/     # React + Vite customer-facing app
└── admin/      # React + Vite admin panel
```

## Quick Start

```bash
# Install all dependencies
npm install

# Run all three apps concurrently
npm run dev

# Or run individually
npm run dev:backend
npm run dev:client
npm run dev:admin
```

## Ports

- Backend: http://localhost:4000
- Client:  http://localhost:5173
- Admin:   http://localhost:5174

## Environment

Copy `.env.example` to `.env` in the `backend/` directory and fill in values.
