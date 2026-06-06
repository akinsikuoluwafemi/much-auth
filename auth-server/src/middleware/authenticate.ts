
// the Guard

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../config/jwt';

export function authenticate(req: Request, res: Response, next: NextFunction) {
  // Prefer Authorization header over cookie for API-to-API calls
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed token'})
  }

  const token = authHeader.slice(7); //Remove "Bearer "

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch (err: any) {
    // Surface specific errors — helps debugging but don't leak internals
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    return res.status(401).json({ error: 'Authentication failed' });
  }
}