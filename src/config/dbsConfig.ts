import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';

const ClusterConfigSchema = z.object({
    url: z.string().url({ message: 'Invalid cluster URL' }),
    username: z.string().optional(),
    password: z.string().optional(),
});

const NetworkConfigSchema = z
    .object({
        type: z.enum(['evm', 'svm', 'tvm', 'polymarket']),
        cluster: z.string(),
    })
    .catchall(z.string());

const DbsConfigSchema = z.object({
    clusters: z.record(z.string(), ClusterConfigSchema),
    networks: z.record(z.string(), NetworkConfigSchema),
});

export type ClusterConfig = z.infer<typeof ClusterConfigSchema>;
export type NetworkConfig = z.infer<typeof NetworkConfigSchema>;
export type DbsConfig = z.infer<typeof DbsConfigSchema>;

export interface NetworkDatabaseMapping {
    database: string;
    type: string;
    cluster: string;
}

type DatabaseMap = Record<string, NetworkDatabaseMapping>;

// Known database maps — add new entries here when onboarding new database types.
// The generic parser populates all of these from YAML `${key}` → `${key}Databases`.
export interface ParsedDbsConfig {
    clusters: Record<string, ClusterConfig>;
    balancesDatabases: DatabaseMap;
    transfersDatabases: DatabaseMap;
    nftsDatabases: DatabaseMap;
    dexesDatabases: DatabaseMap;
    contractsDatabases: DatabaseMap;
    polymarketDatabases: DatabaseMap;
    scraperDatabases: DatabaseMap;
}

function emptyConfig(): ParsedDbsConfig {
    return {
        clusters: {},
        balancesDatabases: {},
        transfersDatabases: {},
        nftsDatabases: {},
        dexesDatabases: {},
        contractsDatabases: {},
        polymarketDatabases: {},
        scraperDatabases: {},
    };
}

export function loadDbsConfig(configPath?: string): ParsedDbsConfig {
    if (!configPath) {
        return emptyConfig();
    }

    const absolutePath = resolve(configPath);

    if (!existsSync(absolutePath)) {
        return emptyConfig();
    }

    const fileContent = readFileSync(absolutePath, 'utf-8');
    const rawConfig = parse(fileContent);
    const config = DbsConfigSchema.parse(rawConfig);

    const result: ParsedDbsConfig = {
        ...emptyConfig(),
        clusters: config.clusters,
    };

    for (const [networkId, networkConfig] of Object.entries(config.networks)) {
        if (!config.clusters[networkConfig.cluster]) {
            throw new Error(`Cluster ${networkConfig.cluster} not found`);
        }
        const { type, cluster, ...databases } = networkConfig;
        const mapping = { type, cluster };

        for (const [key, dbName] of Object.entries(databases)) {
            const prop = `${key}Databases` as keyof ParsedDbsConfig;
            if (prop === 'clusters') continue;
            const map = result[prop] as DatabaseMap | undefined;
            if (map) {
                map[networkId] = { database: dbName, ...mapping };
            }
        }
    }

    return result;
}
