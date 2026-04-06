import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectDB } from './config/db';
import { errorHandler } from './middlewares/errorHandler';
import { authRouter } from './routes/auth.routes';
import { userRouter } from './routes/user.routes';
import { brandRouter } from './routes/brand.routes';
import { categoryRouter } from './routes/category.routes';
import { productRouter } from './routes/product.routes';

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
// TODO Phase 3+:
// app.use('/api/cart', cartRouter);
// app.use('/api/favorites', favoritesRouter);
// app.use('/api/orders', orderRouter);
// app.use('/api/admin', adminRouter);

app.use(errorHandler);

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
