import { Request, Response, NextFunction } from "express";


// Role → permissions mapping
// In production this lives in the DB so it's configurable per org
const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: [
    "users:read",
    "users:write",
    "users:delete",
    "settings:read",
    "settings:write",
    "billing:read",
    "billing:write",
  ],
  member: ["users:read", "settings:read"],
  viewer: ["users:read"],
};


export function authorize(...requiredPermissions: string[]) {
  return (req: Request, res: Response, next: NextFunction) => { 
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // flatten all permission for all roles the user has
    const userPermissions = req.user.roles.flatMap(role => ROLE_PERMISSIONS[role] ?? []);

    //  user must have all required permissions (not just one)
     const hasAll = requiredPermissions.every((perm) =>
       userPermissions.includes(perm),
     );
    
    if (!hasAll) {
      return res.status(403).json({
        error: "Forbidden",
        required: requiredPermissions,
      });
    }

    next();
  }
}
