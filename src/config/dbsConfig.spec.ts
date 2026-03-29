import { afterEach, describe, expect, it } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadDbsConfig } from './dbsConfig.js';

const tempDirs: string[] = [];

afterEach(() => {
    while (tempDirs.length > 0) {
        const dir = tempDirs.pop();
        if (dir) {
            rmSync(dir, { recursive: true, force: true });
        }
    }
});

describe('loadDbsConfig', () => {
    it('parses dedicated SVM database roles', () => {
        const dir = mkdtempSync(join(tmpdir(), 'token-api-dbs-config-'));
        tempDirs.push(dir);

        const configPath = join(dir, 'dbs-config.yaml');
        writeFileSync(
            configPath,
            `
clusters:
  a:
    url: https://example.com
networks:
  solana:
    type: svm
    cluster: a
    accounts: solana:svm-accounts@v0.3.0
    balances: solana:svm-balances@v0.3.0
    transfers: solana:svm-transfers@v0.3.0
    metadata: solana:svm-metadata@v0.3.0
    dexes: solana:svm-dex@v0.3.0
    nfts: solana:svm-nfts@v0.3.0
    staking: solana:svm-staking@v0.3.0
`,
            'utf8'
        );

        const parsed = loadDbsConfig(configPath);

        expect(parsed?.accountsDatabases.solana?.database).toBe('solana:svm-accounts@v0.3.0');
        expect(parsed?.balancesDatabases.solana?.database).toBe('solana:svm-balances@v0.3.0');
        expect(parsed?.transfersDatabases.solana?.database).toBe('solana:svm-transfers@v0.3.0');
        expect(parsed?.metadataDatabases.solana?.database).toBe('solana:svm-metadata@v0.3.0');
        expect(parsed?.dexDatabases.solana?.database).toBe('solana:svm-dex@v0.3.0');
        expect(parsed?.nftDatabases.solana?.database).toBe('solana:svm-nfts@v0.3.0');
        expect(parsed?.stakingDatabases.solana?.database).toBe('solana:svm-staking@v0.3.0');
    });
});
