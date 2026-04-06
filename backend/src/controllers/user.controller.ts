import { Request, Response } from 'express';
import * as userService from '../services/user.service';

export const getMe = async (req: Request, res: Response) => {
  const user = await userService.getMe(req.user!.id);
  res.json(user);
};

export const updateMe = async (req: Request, res: Response) => {
  const user = await userService.updateMe(req.user!.id, req.body);
  res.json(user);
};
