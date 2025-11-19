import { Hono } from 'hono';
import { dexController } from '../controllers/DexController.js';
import { monitorController } from '../controllers/MonitorController.js';
import { nftController } from '../controllers/NftController.js';
import { tokenController } from '../controllers/TokenController.js';

const app = new Hono();

// Mount Monitor Controller routes
app.route('/', monitorController.route);

// Mount Token Controller routes
app.route('/', tokenController.route);

// Mount Dex Controller routes
app.route('/', dexController.route);

// Mount Nft Controller routes
app.route('/', nftController.route);

export default app;
