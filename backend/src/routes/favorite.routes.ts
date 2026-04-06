import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authMiddleware } from '../middlewares/auth';
import * as controller from '../controllers/favorite.controller';

export const favoriteRouter = Router();

favoriteRouter.use(authMiddleware);

favoriteRouter.get('/', asyncHandler(controller.getFavorites));
favoriteRouter.post('/:productId', asyncHandler(controller.addFavorite));
favoriteRouter.delete('/:productId', asyncHandler(controller.removeFavorite));
