import { Router, Request, Response } from "express";
import { publicJwk } from "../config/jwt.js";

const router = Router();

// GET /.well-known/jwks.json
// Public endpoint — no auth required
// Returns the RSA public key in JWK Set format so any service can verify our JWTs
// without needing a copy of the public key file or calling the auth server on each request
router.get("/jwks.json", (req: Request, res: Response) => {
  // Cache for 1 hour — keys rarely change, no need to hammer this endpoint
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.json({ keys: [publicJwk] });
});


router.get("/openid-configuration", (req: Request, res: Response) => {
  const issuer = `${req.protocol}://${req.get("host")}`;

  res.json({
    issuer,
    authorization_endpoint: `${issuer}/auth/authorize`,
    token_endpoint: `${issuer}/auth/token`,
    userinfo_endpoint: `${issuer}/auth/userinfo`,
    jwks_uri: `${issuer}/.well-known/jwks.json`,
    response_types_supported: ["code"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
    scopes_supported: ["openid", "email", "profile"],
    token_endpoint_auth_methods_supported: ["none"],
    code_challenge_methods_supported: ["S256"],
  });
});

export default router;
