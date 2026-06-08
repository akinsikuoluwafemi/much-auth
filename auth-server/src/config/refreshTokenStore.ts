import { db } from "../db/index.js";
import { refreshTokens } from '../db/schema.js';
import { eq } from "drizzle-orm";


// In-memory store — replace with PostgreSQL in Phase 2
// Structure: Map<token, { userId, familyId, used }>


interface RefreshTokenRecord {
  userId: string;   // All tokens in one login chain share a family
  familyId: string;
  used: boolean;
  expiresAt: Date;
}


// change this to use the database instead of in-memory store
// const store = new Map<string, RefreshTokenRecord>();

export const refreshTokenStore = {
  async save(token: string, record: RefreshTokenRecord) {
    await db.insert(refreshTokens).values({
      token,
      userId: record.userId,
      familyId: record.familyId,
      used: record.used,
      expiresAt: record.expiresAt,
    });
  },

  async find(token: string) {
    const [record] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.token, token));
    return record ?? null;
  },

  async markUsed(token: string) {
    await db
      .update(refreshTokens)
      .set({ used: true })
      .where(eq(refreshTokens.token, token));
  },

  async revokeFamily(familyId: string) {
    await db.delete(refreshTokens).where(eq(refreshTokens.familyId, familyId));
  },

  async revokeAllForUser(userId: string) {
    await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
  },
};