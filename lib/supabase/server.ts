import { sql, sqlOne, sqlCount } from '@/lib/db/neon';
import { getUser, type AuthUser } from '@/lib/auth-server';

/**
 * Supabase-compatible database client wrapper.
 * Drop-in replacement for `createClient()` from '@supabase/ssr'.
 * All existing API routes can use this with minimal changes.
 */
export class DbClient {
  /**
   * Auth-compatible interface
   */
  auth = {
    getUser: async (): Promise<{ data: { user: AuthUser | null } }> => {
      const user = await getUser();
      return { data: { user } };
    },
  };

  /**
   * Supabase-compatible query builder
   */
  from(table: string) {
    return new QueryBuilder(table);
  }
}

class QueryBuilder {
  private _table: string;

  constructor(table: string) {
    this._table = table;
  }

  select(columns: string = '*', opts?: { count?: string; head?: boolean }) {
    return new SelectBuilder(this._table, columns, opts);
  }

  insert(data: Record<string, unknown> | Record<string, unknown>[]) {
    return new InsertBuilder(this._table, data);
  }

  update(data: Record<string, unknown>) {
    return new UpdateBuilder(this._table, data);
  }

  delete() {
    return new DeleteBuilder(this._table);
  }

  upsert(data: Record<string, unknown>, opts?: { onConflict?: string }) {
    return new UpsertBuilder(this._table, data, opts?.onConflict);
  }
}

// Helper: build WHERE clauses
type WhereClause = { column: string; op: string; value: unknown };

class BaseBuilder {
  protected _table: string;
  protected _wheres: WhereClause[] = [];
  protected _orderBy: { column: string; ascending: boolean }[] = [];
  protected _limitVal: number | null = null;

  constructor(table: string) {
    this._table = table;
  }

  eq(column: string, value: unknown) {
    this._wheres.push({ column, op: '=', value });
    return this;
  }

  neq(column: string, value: unknown) {
    this._wheres.push({ column, op: '!=', value });
    return this;
  }

  gt(column: string, value: unknown) {
    this._wheres.push({ column, op: '>', value });
    return this;
  }

  gte(column: string, value: unknown) {
    this._wheres.push({ column, op: '>=', value });
    return this;
  }

  lt(column: string, value: unknown) {
    this._wheres.push({ column, op: '<', value });
    return this;
  }

  lte(column: string, value: unknown) {
    this._wheres.push({ column, op: '<=', value });
    return this;
  }

  is(column: string, value: null) {
    this._wheres.push({ column, op: 'IS', value: null });
    return this;
  }

  ilike(column: string, value: string) {
    this._wheres.push({ column, op: 'ILIKE', value });
    return this;
  }

  order(column: string, opts?: { ascending?: boolean }) {
    this._orderBy.push({ column, ascending: opts?.ascending ?? true });
    return this;
  }

  limit(n: number) {
    this._limitVal = n;
    return this;
  }

  protected buildWhere(startIdx: number = 1): { clause: string; params: unknown[] } {
    if (this._wheres.length === 0) return { clause: '', params: [] };

    const parts: string[] = [];
    const params: unknown[] = [];
    let idx = startIdx;

    for (const w of this._wheres) {
      if (w.op === 'IS' && w.value === null) {
        parts.push(`"${w.column}" IS NULL`);
      } else {
        parts.push(`"${w.column}" ${w.op} $${idx}`);
        params.push(w.value);
        idx++;
      }
    }

    return { clause: `WHERE ${parts.join(' AND ')}`, params };
  }

  protected buildOrderBy(): string {
    if (this._orderBy.length === 0) return '';
    return 'ORDER BY ' + this._orderBy.map(o => `"${o.column}" ${o.ascending ? 'ASC' : 'DESC'}`).join(', ');
  }

  protected buildLimit(): string {
    if (this._limitVal === null) return '';
    return `LIMIT ${this._limitVal}`;
  }
}

class SelectBuilder extends BaseBuilder {
  private _columns: string;
  private _countOnly: boolean;
  private _headOnly: boolean;
  private _singleMode: boolean = false;

  constructor(table: string, columns: string, opts?: { count?: string; head?: boolean }) {
    super(table);
    this._columns = columns;
    this._countOnly = opts?.count === 'exact';
    this._headOnly = opts?.head === true;
  }

  single() {
    this._singleMode = true;
    return this;
  }

  async then(resolve: (value: any) => void, reject?: (reason: any) => void) {
    try {
      const result = await this._execute();
      resolve(result);
    } catch (err) {
      if (reject) reject(err);
    }
  }

  private async _execute(): Promise<any> {
    const { clause, params } = this.buildWhere();
    const orderBy = this.buildOrderBy();
    const limit = this.buildLimit();

    // Count-only mode
    if (this._countOnly && this._headOnly) {
      const countQuery = `SELECT COUNT(*) as count FROM "${this._table}" ${clause}`;
      const count = await sqlCount(countQuery, params);
      return { count, data: null, error: null };
    }

    // Handle joined columns like "*, leads(name, niche)"
    const { selectSql, joins, joinTables } = this._parseColumns();

    const query = `SELECT ${selectSql} FROM "${this._table}" ${joins} ${clause} ${orderBy} ${limit}`;

    try {
      const rows = await sql(query, params);

      // Post-process to nest joined data
      const processed = joinTables.length > 0 ? rows.map(row => this._nestJoins(row, joinTables)) : rows;

      if (this._singleMode) {
        return { data: processed[0] || null, error: null };
      }

      return { data: processed, error: null };
    } catch (error: any) {
      return { data: null, error: { message: error.message } };
    }
  }

  private _parseColumns(): { selectSql: string; joins: string; joinTables: string[] } {
    const joinTables: string[] = [];
    let selectSql = '';
    let joins = '';

    // Parse "*, leads(name, niche)" or "id, full_name, agency_id, agencies(*)"
    const joinRegex = /(\w+)\(([^)]+)\)/g;
    let cleaned = this._columns;
    let match;

    while ((match = joinRegex.exec(this._columns)) !== null) {
      const joinTable = match[1];
      const joinCols = match[2];
      joinTables.push(joinTable);

      // Determine FK column name (convention: singular_id or table_id)
      const fkColumn = `${joinTable.replace(/s$/, '')}_id`;

      const joinColsList = joinCols === '*'
        ? `"${joinTable}".*`
        : joinCols.split(',').map(c => `"${joinTable}"."${c.trim()}"`).join(', ');

      joins += ` LEFT JOIN "${joinTable}" ON "${this._table}"."${fkColumn}" = "${joinTable}"."id"`;
      selectSql += (selectSql ? ', ' : '') + joinColsList;

      // Remove from cleaned
      cleaned = cleaned.replace(match[0], '').replace(/,\s*,/g, ',').replace(/^\s*,|,\s*$/g, '');
    }

    // Build the main select
    const mainCols = cleaned.trim() || '*';
    const mainSelect = mainCols === '*'
      ? `"${this._table}".*`
      : mainCols.split(',').map(c => {
          const col = c.trim();
          return col.includes('.') ? col : `"${this._table}"."${col}"`;
        }).join(', ');

    selectSql = mainSelect + (selectSql ? ', ' + selectSql : '');

    return { selectSql, joins, joinTables };
  }

  private _nestJoins(row: Record<string, unknown>, joinTables: string[]): Record<string, unknown> {
    // For simplicity, return as-is (joined columns are flattened)
    // The API routes mostly just access nested data as `.leads?.name` etc.
    // We'll create a nested structure for each join table
    const result = { ...row };

    for (const jt of joinTables) {
      const singular = jt.replace(/s$/, '');
      // Check if any columns from this join table exist
      const nested: Record<string, unknown> = {};
      let hasData = false;

      for (const [key, value] of Object.entries(row)) {
        // Join columns might come back with table prefix or without
        if (key.startsWith(`${jt}_`) || key.startsWith(`${singular}_`)) {
          const cleanKey = key.replace(`${jt}_`, '').replace(`${singular}_`, '');
          nested[cleanKey] = value;
          hasData = true;
        }
      }

      if (hasData) {
        result[jt] = nested;
      }
    }

    return result;
  }
}

class InsertBuilder extends BaseBuilder {
  private _data: Record<string, unknown> | Record<string, unknown>[];
  private _returning: string = '';

  constructor(table: string, data: Record<string, unknown> | Record<string, unknown>[]) {
    super(table);
    this._data = data;
  }

  select(columns?: string) {
    this._returning = columns || '*';
    return this;
  }

  single() {
    return this;
  }

  async then(resolve: (value: any) => void, reject?: (reason: any) => void) {
    try {
      const result = await this._execute();
      resolve(result);
    } catch (err) {
      if (reject) reject(err);
    }
  }

  private async _execute(): Promise<any> {
    const rows = Array.isArray(this._data) ? this._data : [this._data];
    if (rows.length === 0) return { data: [], error: null };

    const columns = Object.keys(rows[0]);
    const colNames = columns.map(c => `"${c}"`).join(', ');

    const allParams: unknown[] = [];
    const valueSets: string[] = [];

    for (const row of rows) {
      const placeholders: string[] = [];
      for (const col of columns) {
        allParams.push(row[col] ?? null);
        placeholders.push(`$${allParams.length}`);
      }
      valueSets.push(`(${placeholders.join(', ')})`);
    }

    const returning = this._returning ? `RETURNING ${this._returning === '*' ? '*' : this._returning}` : 'RETURNING *';
    const query = `INSERT INTO "${this._table}" (${colNames}) VALUES ${valueSets.join(', ')} ${returning}`;

    try {
      const data = await sql(query, allParams);
      return { data: Array.isArray(this._data) ? data : data[0] || null, error: null };
    } catch (error: any) {
      return { data: null, error: { message: error.message } };
    }
  }
}

class UpdateBuilder extends BaseBuilder {
  private _data: Record<string, unknown>;

  constructor(table: string, data: Record<string, unknown>) {
    super(table);
    this._data = data;
  }

  async then(resolve: (value: any) => void, reject?: (reason: any) => void) {
    try {
      const result = await this._execute();
      resolve(result);
    } catch (err) {
      if (reject) reject(err);
    }
  }

  private async _execute(): Promise<any> {
    const columns = Object.keys(this._data);
    const setParams: unknown[] = [];
    const setClauses: string[] = [];

    for (let i = 0; i < columns.length; i++) {
      setClauses.push(`"${columns[i]}" = $${i + 1}`);
      setParams.push(this._data[columns[i]] ?? null);
    }

    const { clause, params: whereParams } = this.buildWhere(setParams.length + 1);
    const allParams = [...setParams, ...whereParams];

    const query = `UPDATE "${this._table}" SET ${setClauses.join(', ')} ${clause}`;

    try {
      await sql(query, allParams);
      return { data: null, error: null };
    } catch (error: any) {
      return { data: null, error: { message: error.message } };
    }
  }
}

class DeleteBuilder extends BaseBuilder {
  constructor(table: string) {
    super(table);
  }

  async then(resolve: (value: any) => void, reject?: (reason: any) => void) {
    try {
      const result = await this._execute();
      resolve(result);
    } catch (err) {
      if (reject) reject(err);
    }
  }

  private async _execute(): Promise<any> {
    const { clause, params } = this.buildWhere();
    const query = `DELETE FROM "${this._table}" ${clause}`;

    try {
      await sql(query, params);
      return { data: null, error: null };
    } catch (error: any) {
      return { data: null, error: { message: error.message } };
    }
  }
}

class UpsertBuilder extends BaseBuilder {
  private _data: Record<string, unknown>;
  private _onConflict: string | undefined;

  constructor(table: string, data: Record<string, unknown>, onConflict?: string) {
    super(table);
    this._data = data;
    this._onConflict = onConflict;
  }

  async then(resolve: (value: any) => void, reject?: (reason: any) => void) {
    try {
      const result = await this._execute();
      resolve(result);
    } catch (err) {
      if (reject) reject(err);
    }
  }

  private async _execute(): Promise<any> {
    const columns = Object.keys(this._data);
    const colNames = columns.map(c => `"${c}"`).join(', ');
    const params: unknown[] = [];
    const placeholders: string[] = [];

    for (const col of columns) {
      params.push(this._data[col] ?? null);
      placeholders.push(`$${params.length}`);
    }

    const conflict = this._onConflict
      ? `ON CONFLICT (${this._onConflict.split(',').map(c => `"${c.trim()}"`).join(', ')})`
      : 'ON CONFLICT';

    const updateClauses = columns
      .filter(c => !this._onConflict?.split(',').map(x => x.trim()).includes(c))
      .map(c => `"${c}" = EXCLUDED."${c}"`)
      .join(', ');

    const query = `INSERT INTO "${this._table}" (${colNames}) VALUES (${placeholders.join(', ')}) ${conflict} DO UPDATE SET ${updateClauses}`;

    try {
      await sql(query, params);
      return { data: null, error: null };
    } catch (error: any) {
      return { data: null, error: { message: error.message } };
    }
  }
}

/**
 * Drop-in replacement for Supabase's `createClient()`.
 * Use in API routes: `const supabase = await createClient();`
 */
export async function createClient(): Promise<DbClient> {
  return new DbClient();
}
