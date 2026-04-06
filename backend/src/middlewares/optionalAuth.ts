import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  id: string;
  role: 'user' | 'admin';
}

export const optionalAuth = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next();
  }
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_ACCESS_SECRET!) as JwtPayload;
    req.user = { id: payload.id, role: payload.role };
  } catch {
    // invalid token — proceed as guest
  }
  next();
};
