import { Request, Response } from 'express';
import * as brandService from '../services/brand.service';

type IdParam = { id: string };

export const getAll = async (_req: Request, res: Response) => {
  const brands = await brandService.getAll();
  res.json(brands);
};

export const create = async (req: Request, res: Response) => {
  const brand = await brandService.create(req.body);
  res.status(201).json(brand);
};

export const update = async (req: Request<IdParam>, res: Response) => {
  const brand = await brandService.update(req.params.id, req.body);
  res.json(brand);
};

export const remove = async (req: Request<IdParam>, res: Response) => {
  await brandService.remove(req.params.id);
  res.json({ message: 'Brand deleted' });
};
