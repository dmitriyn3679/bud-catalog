import { Request, Response } from 'express';
import * as favoriteService from '../services/favorite.service';

type ProductParam = { productId: string };

export const getFavorites = async (req: Request, res: Response) => {
  const items = await favoriteService.getFavorites(req.user!.id);
  res.json(items);
};

export const addFavorite = async (req: Request<ProductParam>, res: Response) => {
  await favoriteService.addFavorite(req.user!.id, req.params.productId);
  res.json({ message: 'Added to favorites' });
};

export const removeFavorite = async (req: Request<ProductParam>, res: Response) => {
  await favoriteService.removeFavorite(req.user!.id, req.params.productId);
  res.json({ message: 'Removed from favorites' });
};
