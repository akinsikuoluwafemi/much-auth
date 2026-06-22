// Ambient declaration — no export, so TypeScript applies this globally to all files
// in the compilation without needing an explicit import.
declare namespace Express {
  interface Request {
    user?: {
      sub: string;
      email: string;
      roles: string[];
      org_id: string;
      org_slug: string;
      jti: string;
      iat?: number;
      exp?: number;
    };
  }
}
