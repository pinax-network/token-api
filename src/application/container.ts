import { UsageQueryExecutor } from '../infrastructure/query/usageQueryExecutor.js';
import { DexController } from './controllers/dexController.js';
import { MonitorController } from './controllers/monitorController.js';
import { NftController } from './controllers/nftController.js';
import { TokenController } from './controllers/tokenController.js';
import { DexService } from './services/dexService.js';
import { MonitorService } from './services/monitorService.js';
import { NftService } from './services/nftService.js';
import { TokenService } from './services/tokenService.js';

const executor = new UsageQueryExecutor();

const tokenService = new TokenService(executor);
const dexService = new DexService(executor);
const nftService = new NftService(executor);
const monitorService = new MonitorService();

export const tokenController = new TokenController(tokenService);
export const dexController = new DexController(dexService);
export const nftController = new NftController(nftService);
export const monitorController = new MonitorController(monitorService);
