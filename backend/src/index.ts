import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectDB } from './config/db';
import { ensureRetailUser } from './utils/ensureRetailUser';
import { ensureAdmin } from './utils/ensureAdmin';
import { errorHandler } from './middlewares/errorHandler';
import { authRouter } from './routes/auth.routes';
import { userRouter } from './routes/user.routes';
import { brandRouter } from './routes/brand.routes';
import { categoryRouter } from './routes/category.routes';
import { productRouter } from './routes/product.routes';
import { cartRouter } from './routes/cart.routes';
import { favoriteRouter } from './routes/favorite.routes';
import { orderRouter } from './routes/order.routes';
import { adminRouter } from './routes/admin.routes';

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

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/brands', brandRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/products', productRouter);
app.use('/api/cart', cartRouter);
app.use('/api/favorites', favoriteRouter);
app.use('/api/orders', orderRouter);
app.use('/api/admin', adminRouter);

app.use(errorHandler);

connectDB().then(async () => {
  await ensureAdmin();
  await ensureRetailUser();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
