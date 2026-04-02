import { describe, expect, it } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadDbsConfig } from './dbsConfig.js';

function writeYaml(content: string): { path: string; cleanup: () => void } {
    const dir = mkdtempSync(join(tmpdir(), 'dbsconfig-test-'));
    const path = join(dir, 'dbs-config.yaml');
    writeFileSync(path, content);
    return { path, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

describe('loadDbsConfig', () => {
    it('should return empty config for undefined path', () => {
        const result = loadDbsConfig(undefined);
        expect(result.clusters).toEqual({});
        expect(result.balancesDatabases).toEqual({});
    });

    it('should return empty config for non-existent path', () => {
        const result = loadDbsConfig('/nonexistent/path.yaml');
        expect(result.clusters).toEqual({});
        expect(result.balancesDatabases).toEqual({});
    });

    it('should parse known database keys into expected properties', () => {
        const { path, cleanup } = writeYaml(`
clusters:
  a:
    url: http://localhost:8123
networks:
  mainnet:
    type: evm
    cluster: a
    balances: mainnet:evm-balances@v0.3.3
    transfers: mainnet:evm-transfers@v0.3.3
    nfts: mainnet:evm-nft-tokens@v0.6.2
    dexes: mainnet:evm-dex@v0.5.0
    contracts: mainnet:evm-contracts@v0.3.0
`);
        try {
            const result = loadDbsConfig(path);
            expect(result.balancesDatabases.mainnet?.database).toBe('mainnet:evm-balances@v0.3.3');
            expect(result.transfersDatabases.mainnet?.database).toBe('mainnet:evm-transfers@v0.3.3');
            expect(result.nftsDatabases.mainnet?.database).toBe('mainnet:evm-nft-tokens@v0.6.2');
            expect(result.dexesDatabases.mainnet?.database).toBe('mainnet:evm-dex@v0.5.0');
            expect(result.contractsDatabases.mainnet?.database).toBe('mainnet:evm-contracts@v0.3.0');
        } finally {
            cleanup();
        }
    });

    it('should parse polymarket database keys', () => {
        const { path, cleanup } = writeYaml(`
clusters:
  c:
    url: http://localhost:8123
networks:
  polymarket:
    type: polymarket
    cluster: c
    polymarket: polygon:evm-polymarket@v0.1.2
    scraper: polymarket
`);
        try {
            const result = loadDbsConfig(path);
            expect(result.polymarketDatabases.polymarket?.database).toBe('polygon:evm-polymarket@v0.1.2');
            expect(result.polymarketDatabases.polymarket?.type).toBe('polymarket');
            expect(result.scraperDatabases.polymarket?.database).toBe('polymarket');
            expect(result.scraperDatabases.polymarket?.cluster).toBe('c');
        } finally {
            cleanup();
        }
    });

    it('should preserve type and cluster in mappings', () => {
        const { path, cleanup } = writeYaml(`
clusters:
  a:
    url: http://localhost:8123
networks:
  solana:
    type: svm
    cluster: a
    balances: solana:svm-tokens@v0.2.8
`);
        try {
            const result = loadDbsConfig(path);
            expect(result.balancesDatabases.solana?.type).toBe('svm');
            expect(result.balancesDatabases.solana?.cluster).toBe('a');
        } finally {
            cleanup();
        }
    });

    it('should throw when cluster is not found', () => {
        const { path, cleanup } = writeYaml(`
clusters:
  a:
    url: http://localhost:8123
networks:
  mainnet:
    type: evm
    cluster: nonexistent
    balances: mainnet:evm-balances@v0.3.3
`);
        try {
            expect(() => loadDbsConfig(path)).toThrow('Cluster nonexistent not found');
        } finally {
            cleanup();
        }
    });

    it('should handle multiple networks on same cluster', () => {
        const { path, cleanup } = writeYaml(`
clusters:
  c:
    url: http://localhost:8123
networks:
  mainnet:
    type: evm
    cluster: c
    balances: mainnet:evm-balances@v0.3.3
  polygon:
    type: evm
    cluster: c
    balances: polygon:evm-balances@v0.3.3
`);
        try {
            const result = loadDbsConfig(path);
            expect(result.balancesDatabases.mainnet?.database).toBe('mainnet:evm-balances@v0.3.3');
            expect(result.balancesDatabases.polygon?.database).toBe('polygon:evm-balances@v0.3.3');
        } finally {
            cleanup();
        }
    });

    it('should initialize known maps as empty when no networks use them', () => {
        const { path, cleanup } = writeYaml(`
clusters:
  a:
    url: http://localhost:8123
networks:
  solana:
    type: svm
    cluster: a
    balances: solana:svm-tokens@v0.2.8
`);
        try {
            const result = loadDbsConfig(path);
            expect(result.transfersDatabases).toEqual({});
            expect(result.nftsDatabases).toEqual({});
            expect(result.polymarketDatabases).toEqual({});
        } finally {
            cleanup();
        }
    });
});
