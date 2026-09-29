import type { NextFunction, Request, Response } from 'express';
import { db } from '../lib/db.js';
import { AppError } from '../lib/errors.js';

export async function requireUser(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.header('authorization');
    if (!header?.startsWith('Bearer ')) {
      throw new AppError(401, 'Sign in to keep Toodling.');
    }
    const token = header.slice('Bearer '.length).trim();
    const { data, error } = await db().auth.getUser(token);
    if (error || !data.user) {
      throw new AppError(401, 'Your session wandered off. Sign in again.');
    }
    req.userId = data.user.id;
    next();
  } catch (error) {
    next(error);
  }
}
