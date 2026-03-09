export abstract class BaseRepository {
  constructor(
    protected readonly db: D1Database,
    protected readonly account_id: string,
  ) {}

  protected async all<T>(query: string, ...params: unknown[]): Promise<T[]> {
    const stmt = this.db.prepare(query);
    const bound = params.length > 0 ? stmt.bind(...params) : stmt;
    const result = await bound.all<T>();
    return result.results;
  }

  protected async first<T>(query: string, ...params: unknown[]): Promise<T | null> {
    const stmt = this.db.prepare(query);
    const bound = params.length > 0 ? stmt.bind(...params) : stmt;
    return bound.first<T>();
  }

  protected async run(query: string, ...params: unknown[]): Promise<D1Result> {
    const stmt = this.db.prepare(query);
    const bound = params.length > 0 ? stmt.bind(...params) : stmt;
    return bound.run();
  }

  protected async paginate<T>(
    query: string,
    countQuery: string,
    page: number,
    perPage: number,
    ...params: unknown[]
  ): Promise<{ data: T[]; total: number; page: number; per_page: number; total_pages: number }> {
    const offset = (page - 1) * perPage;

    const countRow = await this.first<{ total: number }>(countQuery, ...params);
    const total = countRow?.total ?? 0;

    const paginatedQuery = `${query} LIMIT ? OFFSET ?`;
    const data = await this.all<T>(paginatedQuery, ...params, perPage, offset);

    return {
      data,
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    };
  }
}
