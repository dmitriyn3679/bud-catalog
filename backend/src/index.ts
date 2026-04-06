import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectDB } from './config/db';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:5173',
    process.env.ADMIN_URL || 'http://localhost:5174',
  ],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// routes will be mounted here (Phase 1+)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// TODO: mount routes
// app.use('/api/auth', authRouter);
// app.use('/api/users', userRouter);
// app.use('/api/products', productRouter);
// app.use('/api/brands', brandRouter);
// app.use('/api/categories', categoryRouter);
// app.use('/api/cart', cartRouter);
// app.use('/api/favorites', favoritesRouter);
// app.use('/api/orders', orderRouter);
// app.use('/api/admin', adminRouter);

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
