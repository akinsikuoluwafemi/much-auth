// This tells TypeScript that req.user exists after authentication
declare global {
  namespace Express {
    interface Request {
      user?: import("../config/jwt").TokenPayload;
    }
  }
}

export {};
