import { Request, Response, NextFunction } from 'express';

export const roleGuard = (...roles: Array<'user' | 'admin'>) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }
    next();
  };
