import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';

type AsyncFn<P extends ParamsDictionary = ParamsDictionary, ReqBody = unknown, ResBody = unknown, ReqQuery extends ParsedQs = ParsedQs> = (
  req: Request<P, ResBody, ReqBody, ReqQuery>,
  res: Response<ResBody>,
  next: NextFunction,
) => Promise<unknown>;

export const asyncHandler = <P extends ParamsDictionary = ParamsDictionary, ReqBody = unknown, ResBody = unknown, ReqQuery extends ParsedQs = ParsedQs>(
  fn: AsyncFn<P, ReqBody, ResBody, ReqQuery>,
): RequestHandler<P, ResBody, ReqBody, ReqQuery> =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };
