import { Request, Response } from 'express';
import * as categoryService from '../services/category.service';

type IdParam = { id: string };

export const getTree = async (_req: Request, res: Response) => {
  const tree = await categoryService.getTree();
  res.json(tree);
};

export const create = async (req: Request, res: Response) => {
  const category = await categoryService.create(req.body);
  res.status(201).json(category);
};

export const update = async (req: Request<IdParam>, res: Response) => {
  const category = await categoryService.update(req.params.id, req.body);
  res.json(category);
};

export const remove = async (req: Request<IdParam>, res: Response) => {
  await categoryService.remove(req.params.id);
  res.json({ message: 'Category deleted' });
};
