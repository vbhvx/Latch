import type pg from "pg";
import type { User } from "./user.repository.js";

export interface Session {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
  last_seen_at: Date;
  revoked_at: Date | null;
}

export interface SessionWithUser {
  session: Session;
  user: User;
}

type Queryable = pg.Pool | pg.PoolClient;

export const sessionRepository = {
  /**
   * Persist a new server-managed session.
   * Only the token hash is stored.
   */
  async createSession(db: Queryable, userId: string, tokenHash: string, expiresAt: Date): Promise<Session> {
    const query = `
      INSERT INTO sessions (user_id, token_hash, expires_at)
      VALUES ($1, $2, $3)
      RETURNING id, user_id, token_hash, expires_at, created_at, last_seen_at, revoked_at;
    `;
    const res = await db.query(query, [userId, tokenHash, expiresAt]);
    return res.rows[0];
  },

  /**
   * Look up an active, non-expired, non-revoked session by its SHA-256 token hash.
   * Joins the active user.
   */
  async findValidSessionByTokenHash(db: Queryable, tokenHash: string): Promise<SessionWithUser | null> {
    const query = `
      SELECT
        s.id AS session_id,
        s.user_id,
        s.token_hash,
        s.expires_at,
        s.created_at AS session_created_at,
        s.last_seen_at,
        s.revoked_at,
        u.id AS u_id,
        u.email,
        u.display_name,
        u.status AS user_status,
        u.created_at AS u_created_at,
        u.updated_at AS u_updated_at
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token_hash = $1
        AND s.revoked_at IS NULL
        AND s.expires_at > NOW()
        AND u.status = 'active';
    `;
    const res = await db.query(query, [tokenHash]);
    if (res.rows.length === 0) return null;

    const row = res.rows[0];
    return {
      session: {
        id: row.session_id,
        user_id: row.user_id,
        token_hash: row.token_hash,
        expires_at: row.expires_at,
        created_at: row.session_created_at,
        last_seen_at: row.last_seen_at,
        revoked_at: row.revoked_at,
      },
      user: {
        id: row.u_id,
        email: row.email,
        display_name: row.display_name,
        status: row.user_status,
        created_at: row.u_created_at,
        updated_at: row.u_updated_at,
      },
    };
  },

  /**
   * Update the session's last seen timestamp to maintain activity records.
   */
  async touchSession(db: Queryable, sessionId: string): Promise<void> {
    const query = `
      UPDATE sessions
      SET last_seen_at = NOW()
      WHERE id = $1;
    `;
    await db.query(query, [sessionId]);
  },

  /**
   * Revoke a specific session (used upon logout).
   */
  async revokeSession(db: Queryable, sessionId: string): Promise<boolean> {
    const query = `
      UPDATE sessions
      SET revoked_at = NOW()
      WHERE id = $1 AND revoked_at IS NULL
      RETURNING id;
    `;
    const res = await db.query(query, [sessionId]);
    return res.rows.length > 0;
  },

  /**
   * Revoke all active sessions for a user (e.g. security reset).
   */
  async revokeAllUserSessions(db: Queryable, userId: string): Promise<number> {
    const query = `
      UPDATE sessions
      SET revoked_at = NOW()
      WHERE user_id = $1 AND revoked_at IS NULL;
    `;
    const res = await db.query(query, [userId]);
    return res.rowCount ?? 0;
  },

  /**
   * Purge expired sessions for database hygiene.
   */
  async deleteExpiredSessions(db: Queryable): Promise<number> {
    const query = `
      DELETE FROM sessions
      WHERE expires_at <= NOW();
    `;
    const res = await db.query(query);
    return res.rowCount ?? 0;
  },
};
