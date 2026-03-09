import type { User } from '@flarelens/shared';
import { BaseRepository } from '../repository.js';

export class UsersRepository extends BaseRepository {
  async findByEmail(email: string): Promise<User | null> {
    return this.first<User>(
      'SELECT * FROM users WHERE email = ?',
      email,
    );
  }

  async findById(id: string): Promise<User | null> {
    return this.first<User>(
      'SELECT * FROM users WHERE id = ?',
      id,
    );
  }

  async create(data: {
    id: string;
    email: string;
    name: string;
    password_hash?: string;
    oauth_provider?: string;
    oauth_id?: string;
  }): Promise<User> {
    await this.run(
      `INSERT INTO users (id, email, name, password_hash, oauth_provider, oauth_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      data.id,
      data.email,
      data.name,
      data.password_hash ?? null,
      data.oauth_provider ?? null,
      data.oauth_id ?? null,
    );
    const user = await this.findById(data.id);
    if (!user) throw new Error('Failed to create user');
    return user;
  }

  async updateProfile(id: string, data: { name?: string; avatar_url?: string | null }): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if ('avatar_url' in data) {
      fields.push('avatar_url = ?');
      values.push(data.avatar_url);
    }

    if (fields.length === 0) return;

    fields.push("updated_at = datetime('now')");
    values.push(id);

    await this.run(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      ...values,
    );
  }

  async updatePassword(id: string, password_hash: string): Promise<void> {
    await this.run(
      "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?",
      password_hash,
      id,
    );
  }

  async markEmailVerified(id: string): Promise<void> {
    await this.run(
      "UPDATE users SET email_verified = 1, updated_at = datetime('now') WHERE id = ?",
      id,
    );
  }
}
