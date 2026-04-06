import { Request, Response } from 'express';
import * as cartService from '../services/cart.service';

type ProductParam = { productId: string };

export const getCart = async (req: Request, res: Response) => {
  const cart = await cartService.getCart(req.user!.id);
  res.json(cart);
};

export const addItem = async (req: Request, res: Response) => {
  const { productId, quantity } = req.body;
  const cart = await cartService.addItem(req.user!.id, productId, quantity);
  res.json(cart);
};

export const updateItem = async (req: Request<ProductParam>, res: Response) => {
  const cart = await cartService.updateItem(req.user!.id, req.params.productId, req.body.quantity);
  res.json(cart);
};

export const removeItem = async (req: Request<ProductParam>, res: Response) => {
  await cartService.removeItem(req.user!.id, req.params.productId);
  res.json({ message: 'Item removed' });
};

export const clearCart = async (req: Request, res: Response) => {
  await cartService.clearCart(req.user!.id);
  res.json({ message: 'Cart cleared' });
};
