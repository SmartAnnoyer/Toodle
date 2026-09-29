import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/errors.js';

export function errorMiddleware(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof AppError) {
    res.status(error.status).json({ error: error.message, code: error.code });
    return;
  }
  console.error(error);
  res.status(500).json({ error: 'Something went weird. Try again.' });
}
