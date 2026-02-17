/** Extract version from database name (e.g. "mainnet:evm-transfers@v0.2.2" → "0.2.2") */
export function extractVersion(database: string): string {
    const match = database.match(/@v(.+)$/);
    return match?.[1] ?? 'unknown';
}
