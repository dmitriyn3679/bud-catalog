import { Request, Response } from 'express';
import * as productService from '../services/product.service';
import type { SortOption } from '../services/product.service';

type IdParam = { id: string };
type ImageParam = { id: string; publicId: string };

const VALID_SORTS: SortOption[] = ['recommended', 'price_asc', 'price_desc'];

const parseFilters = (query: Request['query']) => {
  const sort = query.sort as string | undefined;
  return {
    category: query.category as string | undefined,
    brand: query.brand as string | undefined,
    search: query.search as string | undefined,
    sort: VALID_SORTS.includes(sort as SortOption) ? (sort as SortOption) : undefined,
    page: query.page ? Number(query.page) : undefined,
    limit: query.limit ? Number(query.limit) : undefined,
  };
};

// Public
export const getAll = async (req: Request, res: Response) => {
  const result = await productService.getAll(parseFilters(req.query), req.user?.id);
  res.json(result);
};

export const getById = async (req: Request<IdParam>, res: Response) => {
  const product = await productService.getById(req.params.id, req.user?.id);
  res.json(product);
};

// Admin
export const getAllAdmin = async (req: Request, res: Response) => {
  const result = await productService.getAllAdmin(parseFilters(req.query));
  res.json(result);
};

export const getByIdAdmin = async (req: Request<IdParam>, res: Response) => {
  const product = await productService.getByIdAdmin(req.params.id);
  res.json(product);
};

export const create = async (req: Request, res: Response) => {
  const product = await productService.create(req.body);
  res.status(201).json(product);
};

export const update = async (req: Request<IdParam>, res: Response) => {
  const product = await productService.update(req.params.id, req.body);
  res.json(product);
};

export const remove = async (req: Request<IdParam>, res: Response) => {
  await productService.remove(req.params.id);
  res.json({ message: 'Product deleted' });
};

export const addImages = async (req: Request<IdParam>, res: Response) => {
  const files = req.files as Express.Multer.File[];
  if (!files?.length) {
    res.status(400).json({ message: 'No files uploaded' });
    return;
  }
  const images = await productService.addImages(req.params.id, files);
  res.json(images);
};

export const removeImage = async (req: Request<ImageParam>, res: Response) => {
  const publicId = decodeURIComponent(req.params.publicId);
  await productService.removeImage(req.params.id, publicId);
  res.json({ message: 'Image deleted' });
};

export const bulkUpdate = async (req: Request, res: Response) => {
  const { ids, updates } = req.body as { ids: string[]; updates: productService.BulkUpdateData };
  await productService.bulkUpdate(ids, updates);
  res.json({ message: 'Updated' });
};
