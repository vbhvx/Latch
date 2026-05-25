import type pg from "pg";

export interface User {
  id: string;
  email: string;
  display_name: string;
  status: "active" | "suspended" | "deactivated";
  created_at: Date;
  updated_at: Date;
}

export interface UserWithPasswordHash extends User {
  password_hash: string;
}

export interface CreateUserInput {
  email: string;
  display_name: string;
  password_hash: string;
}

type Queryable = pg.Pool | pg.PoolClient;

export const userRepository = {
  /**
   * Create a new user with normalized lowercase email.
   */
  async createUser(db: Queryable, input: CreateUserInput): Promise<User> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const query = `
      INSERT INTO users (email, display_name, password_hash, status)
      VALUES ($1, $2, $3, 'active')
      RETURNING id, email, display_name, status, created_at, updated_at;
    `;
    const res = await db.query(query, [normalizedEmail, input.display_name.trim(), input.password_hash]);
    return res.rows[0];
  },

  /**
   * Retrieve a user by ID without exposing the password hash.
   */
  async findById(db: Queryable, id: string): Promise<User | null> {
    const query = `
      SELECT id, email, display_name, status, created_at, updated_at
      FROM users
      WHERE id = $1;
    `;
    const res = await db.query(query, [id]);
    return res.rows[0] || null;
  },

  /**
   * Retrieve a user by email without exposing the password hash.
   */
  async findByEmail(db: Queryable, email: string): Promise<User | null> {
    const query = `
      SELECT id, email, display_name, status, created_at, updated_at
      FROM users
      WHERE LOWER(email) = LOWER($1);
    `;
    const res = await db.query(query, [email.trim()]);
    return res.rows[0] || null;
  },

  /**
   * Retrieve user with password hash strictly for authentication verification.
   * Internal data layer use only.
   */
  async findWithPasswordByEmail(db: Queryable, email: string): Promise<UserWithPasswordHash | null> {
    const query = `
      SELECT id, email, display_name, password_hash, status, created_at, updated_at
      FROM users
      WHERE LOWER(email) = LOWER($1);
    `;
    const res = await db.query(query, [email.trim()]);
    return res.rows[0] || null;
  },

  /**
   * Update user status.
   */
  async updateStatus(
    db: Queryable,
    id: string,
    status: "active" | "suspended" | "deactivated"
  ): Promise<User | null> {
    const query = `
      UPDATE users
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, email, display_name, status, created_at, updated_at;
    `;
    const res = await db.query(query, [status, id]);
    return res.rows[0] || null;
  },
};

