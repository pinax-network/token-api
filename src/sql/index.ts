/**
 * Reads a SQL file and returns its content as a single-line string.
 *
 * @param path - The path to the SQL file.
 * Note that if using relative paths, the starting directory will be the current working directory (i.e. `process.cwd()`)
 * @returns A promise that resolves to the SQL query as a single-line string
 *
 * @example
 * const query = await readSQL('./src/routes/tokens/evm.sql');
 */
export async function readSQL(path: string) {
    const content = await Bun.file(path).text();
    // Fold multiline statement into single line
    return content.replace(/\n|;/g, ' ').trim();
}
