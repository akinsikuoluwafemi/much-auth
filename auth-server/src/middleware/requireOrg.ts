import { Request, Response, NextFunction } from "express";


export function requireOrg(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.org_id) {
    return res.status(400).json({
      error: "No organisation context",
      message: "Your token must include an org_id",
    });
  }
  next();
}