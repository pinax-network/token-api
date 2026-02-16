/**
 * Normalizes a SQL query string by folding multiline statements into a single line
 * and removing semicolons.
 *
 * @param query - The raw SQL query string (e.g. imported via `import query from './file.sql' with { type: 'text' }`)
 * @returns The normalized SQL query as a single-line string
 *
 * @example
 * import query from './tokens/evm.sql' with { type: 'text' };
 * const normalized = normalizeSQL(query);
 */
export function normalizeSQL(query: string) {
    return query.replace(/\n|;/g, ' ').trim();
}
