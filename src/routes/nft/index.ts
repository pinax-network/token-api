import { Hono } from 'hono';
import collections_by_contract from "./collections_by_contract/index.js";
import items_by_token_id from "./items_by_token_id/index.js";
import transfers_address from "./transfers_address/index.js";
import transfers_collection from "./transfers_collection/index.js";
import wallet from "./wallet/index.js";

const router = new Hono();

router.route('/collections', collections_by_contract);
router.route('/items', items_by_token_id);
// router.route('/transfers_address', transfers_address);
// router.route('/transfers_collection', transfers_collection);
// router.route('/wallet', wallet);

export default router;
