# much-auth

A production-style auth system built from scratch — no auth libraries, no magic.

The goal: understand OAuth2, OIDC, JWTs, and session management at the protocol level before using libraries that abstract it away.

Built with Node.js · TypeScript · Next.js 16 · iron-session

---

## What's implemented

### Phase 1 — Foundations

#### JWT (auth-server)
- RSA key pair generation (RS256)
- Access token issuance with `iss`, `aud`, `jti` claims
- JWT verification middleware
- bcrypt password hashing with timing-attack-safe login

#### OAuth2 Authorization Code + PKCE with OIDC (my-app)
- PKCE flow implemented manually — no NextAuth, no Passport, no Auth.js
- `code_verifier` / `code_challenge` generation (SHA256, base64url)
- `state` parameter for CSRF protection
- Google OAuth2 token exchange (code → access_token + id_token)
- ID token decoding (OIDC identity layer)
- Encrypted, signed session via iron-session (`httpOnly` cookie)
- Protected dashboard — redirects unauthenticated users to login

---

## Roadmap

- [ ] Refresh token rotation with reuse detection
- [ ] TOTP-based MFA (Google Authenticator)
- [ ] PostgreSQL — replace in-memory stores
- [ ] Multi-tenant organizations + invitation flow
- [ ] RBAC — roles and permissions per org
- [ ] SCIM 2.0 endpoint for enterprise directory sync
- [ ] Audit logging for all auth events
- [ ] `/.well-known/jwks.json` public key endpoint
- [ ] Keycloak integration

---

## Architecture

```
my-app (Next.js)          auth-server (Node.js/Express)
├── /auth/login           ├── POST /auth/register
├── /api/auth/google      ├── POST /auth/login
├── /auth/callback/google ├── POST /auth/refresh
├── /auth/logout          ├── GET  /.well-known/jwks.json
└── /dashboard            └── GET  /api/me
```

---

## How to run

**Prerequisites:** Node.js 20+, pnpm

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/much-auth.git
cd much-auth

# Auth server
cd auth-server
cp .env.example .env        # fill in values
mkdir keys
openssl genrsa -out keys/private.pem 2048
openssl rsa -in keys/private.pem -pubout -out keys/public.pem
pnpm install
pnpm dev                    # runs on :4000

# Next.js app (new terminal)
cd my-app
cp .env.local.example .env.local   # fill in Google credentials + SESSION_SECRET
pnpm install
pnpm dev                    # runs on :3000
```

Open `http://localhost:3000/auth/login`


### Environment setup

```bash
# Next.js app
cp my-app/.env.local.example my-app/.env.local
# Fill in GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SESSION_SECRET

# Auth server
cp auth-server/.env.example auth-server/.env



---

## Key decisions

**Why RS256 and not HS256?**
RS256 uses a private key to sign and a public key to verify. In a microservices setup, every service can verify tokens using only the public key — they can never issue tokens. HS256 shares one secret across all services, which means any service that can verify can also forge.

**Why PKCE instead of client_secret?**
A client_secret embedded in a frontend or mobile app can be extracted from the bundle. PKCE replaces it with a one-time cryptographic challenge that proves the entity completing the flow initiated it — without ever transmitting a secret.

**Why iron-session instead of JWT cookies for the session?**
The session holds temporary PKCE state (`code_verifier`) during the OAuth redirect. A JWT is stateless and can't be mutated mid-flow. iron-session gives encrypted, server-controlled state with a clean API.