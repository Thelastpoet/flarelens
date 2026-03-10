import type { TeamMember } from '@flarelens/shared';
import { BaseRepository } from '../repository.js';

export class TeamMembersRepository extends BaseRepository {
	async list(): Promise<TeamMember[]> {
		return this.all<TeamMember>(
			'SELECT * FROM team_members WHERE account_id = ? ORDER BY created_at ASC',
			this.account_id,
		);
	}

	async findByUserId(user_id: string): Promise<TeamMember | null> {
		return this.first<TeamMember>(
			'SELECT * FROM team_members WHERE account_id = ? AND user_id = ?',
			this.account_id,
			user_id,
		);
	}

	async findById(id: string): Promise<TeamMember | null> {
		return this.first<TeamMember>(
			'SELECT * FROM team_members WHERE id = ? AND account_id = ?',
			id,
			this.account_id,
		);
	}

	async findByEmail(email: string): Promise<TeamMember | null> {
		return this.first<TeamMember>(
			'SELECT * FROM team_members WHERE account_id = ? AND email = ?',
			this.account_id,
			email,
		);
	}

	async create(data: {
		id: string;
		email: string;
		role: string;
		invited_by: string;
		user_id?: string;
	}): Promise<TeamMember> {
		await this.run(
			`INSERT INTO team_members (id, account_id, user_id, email, role, status, invited_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
			data.id,
			this.account_id,
			data.user_id ?? null,
			data.email,
			data.role,
			data.user_id ? 'active' : 'pending',
			data.invited_by,
		);
		const member = await this.first<TeamMember>('SELECT * FROM team_members WHERE id = ?', data.id);
		if (!member) throw new Error('Failed to create team member');
		return member;
	}

	async accept(id: string, user_id: string): Promise<void> {
		await this.run(
			`UPDATE team_members
       SET user_id = ?, status = 'active', accepted_at = datetime('now')
       WHERE id = ? AND account_id = ?`,
			user_id,
			id,
			this.account_id,
		);
	}

	async updateRole(id: string, role: string): Promise<void> {
		await this.run(
			'UPDATE team_members SET role = ? WHERE id = ? AND account_id = ?',
			role,
			id,
			this.account_id,
		);
	}

	async remove(id: string): Promise<void> {
		await this.run('DELETE FROM team_members WHERE id = ? AND account_id = ?', id, this.account_id);
	}

	async updateLastActive(id: string): Promise<void> {
		await this.run(
			"UPDATE team_members SET last_active_at = datetime('now') WHERE id = ? AND account_id = ?",
			id,
			this.account_id,
		);
	}

	async count(): Promise<number> {
		const row = await this.first<{ total: number }>(
			"SELECT COUNT(*) as total FROM team_members WHERE account_id = ? AND status = 'active'",
			this.account_id,
		);
		return row?.total ?? 0;
	}
}
