// In-memory store — replace with PostgreSQL in Phase 2
// Structure: Map<token, { userId, familyId, used }>


interface RefreshTokenRecord {
  userId: string;   // All tokens in one login chain share a family
  familyId: string;
  used: boolean;
  expiresAt: Date;
}


const store = new Map<string, RefreshTokenRecord>();

export const refreshTokenStore = {
  save(token: string, record: RefreshTokenRecord) {
    store.set(token, record);
  },

  find(token: string) {
    return store.get(token);
  },

  markUsed(token: string) {
    const record = store.get(token);
    if (record) {
      store.set(token, { ...record, used: true });
    }
  },

  // revoke all tokens in a family (resuse detection)
  revokeFamily(familyId: string) {
    for (const [token, record] of store.entries()) {
      if (record.familyId === familyId) {
        store.delete(token); // delete all tokens in the family
      }
    }
  },

  revokeAllForUser(userId: string) {
    for (const [token, record] of store.entries()) {
      if(record.userId === userId) {
        store.delete(token); // delete all tokens for this user
      }
    }
  }
}