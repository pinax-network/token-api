import { readdir, readFile } from 'node:fs/promises';
import { join } from 'path';
import { logger } from '../logger.js';

/**
 * Loads all SQL files from a specified directory (non-recursive) into a key-value object
 *
 * @param folderPath - The path to the directory containing SQL files.
 * Note that if using relative paths, the starting directory will be the current working directory (i.e. `process.cwd()`)
 * @returns A promise that resolves to an object where:
 *   - Keys are the filenames without the .sql extension
 *   - Values are the contents of the corresponding SQL files as strings
 *
 * @example
 * // Load SQL files from the 'balances_for_account' directory
 * const sqlQueries = await loadSqlFiles('./src/sql/balances_for_account');
 *
 * // Access a specific query for a chain
 * const evmQuery = sqlQueries['evm'];
 *
 * @throws Will throw an error if the directory cannot be read or if a file cannot be loaded
 */
export async function loadSqlFiles(folderPath: string): Promise<Record<string, string>> {
    const sqlFiles: Record<string, string> = {};

    try {
        const files = await readdir(folderPath);

        for (const file of files) {
            if (file.endsWith('.sql')) {
                const filePath = join(folderPath, file);
                const content = await readFile(filePath, 'utf-8');

                // Use the filename without extension as the key
                const key = file.replace('.sql', '');
                // Fold multiline statement into single line
                sqlFiles[key] = content.replace(/\n|;/g, ' ').trim();
            }
        }

        return sqlFiles;
    } catch (error) {
        logger.error('Error loading SQL files:', error);
        throw error;
    }
}

const sqlQueries: Record<string, Record<string, string>> = {};
try {
    const subdirs = await readdir("./src/sql", { withFileTypes: true });

    for (const dirent of subdirs) {
        if (dirent.isDirectory()) {
            const subfolderName = dirent.name;
            const subfolderPath = join("./src/sql", subfolderName);

            const subfolderQueries = await loadSqlFiles(subfolderPath);
            sqlQueries[subfolderName] = subfolderQueries;
        }
    }
} catch (error) {
    logger.error('Error loading SQL files from subdirectories:', error);
    throw error;
}

logger.trace(`Loaded SQL queries:\n`, Object.keys(sqlQueries));
export { sqlQueries };
