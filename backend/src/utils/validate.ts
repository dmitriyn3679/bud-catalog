import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validate = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
  const result = schema.safeParse({ body: req.body, params: req.params, query: req.query });
  if (!result.success) {
    const err = (result.error as ZodError).errors[0];
    res.status(400).json({ message: `${err.path.slice(1).join('.')}: ${err.message}` });
    return;
  }
  next();
};
