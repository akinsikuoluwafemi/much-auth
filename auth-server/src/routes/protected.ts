import { Request, Response, Router } from "express";
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.get('/me', authenticate, (req: Request, res: Response) => {
  // req.user is guaranteed non-null here because authenticate called next()
  console.log(req.user, 'req.user in /me route');
  res.json({ user: req.user });
})

export default router;