import crypto from 'crypto';

// code_verifier: random string 43-128 chars, URL-safe
export function generateCodeVerifier(): string {
  return crypto.randomBytes(64).toString('base64url');
}

// code_challenge: SHA256(code_verifier), base64url-encoded
// The spec requires this exact transformation
export function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

// state: random string to prevent CSRF
// When Google redirects back, we verify this matches what we sent
export function generateState(): string {
  return crypto.randomBytes(32).toString('base64url');
}