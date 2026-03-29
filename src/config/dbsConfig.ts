import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';

const ClusterConfigSchema = z.object({
    url: z.string().url({ message: 'Invalid cluster URL' }),
    username: z.string().optional(),
    password: z.string().optional(),
});

const NetworkConfigSchema = z.object({
    type: z.enum(['evm', 'svm', 'tvm']),
    cluster: z.string(),
    accounts: z.string().optional(),
    transfers: z.string().optional(),
    balances: z.string().optional(),
    metadata: z.string().optional(),
    nfts: z.string().optional(),
    dexes: z.string().optional(),
    contracts: z.string().optional(),
    staking: z.string().optional(),
});

const DbsConfigSchema = z.object({
    clusters: z.record(z.string(), ClusterConfigSchema),
    networks: z.record(z.string(), NetworkConfigSchema),
});

export type ClusterConfig = z.infer<typeof ClusterConfigSchema>;
export type NetworkConfig = z.infer<typeof NetworkConfigSchema>;
export type DbsConfig = z.infer<typeof DbsConfigSchema>;

export interface NetworkDatabaseMapping {
    database: string;
    type: 'evm' | 'svm' | 'tvm';
    cluster: string;
}

export interface ParsedDbsConfig {
    clusters: Record<string, ClusterConfig>;
    accountsDatabases: Record<string, NetworkDatabaseMapping>;
    balancesDatabases: Record<string, NetworkDatabaseMapping>;
    transfersDatabases: Record<string, NetworkDatabaseMapping>;
    metadataDatabases: Record<string, NetworkDatabaseMapping>;
    nftDatabases: Record<string, NetworkDatabaseMapping>;
    dexDatabases: Record<string, NetworkDatabaseMapping>;
    contractDatabases: Record<string, NetworkDatabaseMapping>;
    stakingDatabases: Record<string, NetworkDatabaseMapping>;
}

export function loadDbsConfig(configPath?: string): ParsedDbsConfig | null {
    if (!configPath) {
        return null;
    }

    const absolutePath = resolve(configPath);

    if (!existsSync(absolutePath)) {
        return null;
    }

    const fileContent = readFileSync(absolutePath, 'utf-8');
    const rawConfig = parse(fileContent);
    const config = DbsConfigSchema.parse(rawConfig);

    const result: ParsedDbsConfig = {
        clusters: config.clusters,
        accountsDatabases: {},
        balancesDatabases: {},
        transfersDatabases: {},
        metadataDatabases: {},
        nftDatabases: {},
        dexDatabases: {},
        contractDatabases: {},
        stakingDatabases: {},
    };

    for (const [networkId, networkConfig] of Object.entries(config.networks)) {
        if (!config.clusters[networkConfig.cluster]) {
            throw new Error(`Cluster ${networkConfig.cluster} not found`);
        }
        const mapping = {
            type: networkConfig.type,
            cluster: networkConfig.cluster,
        };

        if (networkConfig.accounts) {
            result.accountsDatabases[networkId] = {
                database: networkConfig.accounts,
                ...mapping,
            };
        }

        if (networkConfig.balances) {
            result.balancesDatabases[networkId] = {
                database: networkConfig.balances,
                ...mapping,
            };
        }

        if (networkConfig.transfers) {
            result.transfersDatabases[networkId] = {
                database: networkConfig.transfers,
                ...mapping,
            };
        }

        if (networkConfig.metadata) {
            result.metadataDatabases[networkId] = {
                database: networkConfig.metadata,
                ...mapping,
            };
        }

        if (networkConfig.nfts) {
            result.nftDatabases[networkId] = {
                database: networkConfig.nfts,
                ...mapping,
            };
        }

        if (networkConfig.dexes) {
            result.dexDatabases[networkId] = {
                database: networkConfig.dexes,
                ...mapping,
            };
        }

        if (networkConfig.contracts) {
            result.contractDatabases[networkId] = {
                database: networkConfig.contracts,
                ...mapping,
            };
        }

        if (networkConfig.staking) {
            result.stakingDatabases[networkId] = {
                database: networkConfig.staking,
                ...mapping,
            };
        }
    }

    return result;
}
