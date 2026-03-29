import type { config as Config } from '../config.js';
import type { NetworkDatabaseMapping } from './dbsConfig.js';

type ConfigType = typeof Config;

export type DatabaseCategory =
    | 'balances'
    | 'transfers'
    | 'nft'
    | 'dex'
    | 'contracts'
    | 'accounts'
    | 'metadata'
    | 'staking';

export const DATABASE_CATEGORY_GETTERS: Record<
    DatabaseCategory,
    (cfg: ConfigType) => Record<string, NetworkDatabaseMapping>
> = {
    balances: (cfg) => cfg.balancesDatabases,
    transfers: (cfg) => cfg.transfersDatabases,
    nft: (cfg) => cfg.nftDatabases,
    dex: (cfg) => cfg.dexDatabases,
    contracts: (cfg) => cfg.contractDatabases,
    accounts: (cfg) => cfg.accountsDatabases,
    metadata: (cfg) => cfg.metadataDatabases,
    staking: (cfg) => cfg.stakingDatabases,
};

export function getAllDatabaseMappings(cfg: ConfigType) {
    return Object.values(DATABASE_CATEGORY_GETTERS).map((getter) => getter(cfg));
}

export function getFirstDatabaseForNetwork(cfg: ConfigType, network: string): NetworkDatabaseMapping | null {
    for (const mapping of getAllDatabaseMappings(cfg)) {
        if (mapping[network]) {
            return mapping[network];
        }
    }

    return null;
}
