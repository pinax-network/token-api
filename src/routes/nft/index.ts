import { Hono } from 'hono';
import metadata from "./metadata/index.js";
import token from "./token/index.js";
import transfers_address from "./transfers_address/index.js";
import transfers_collection from "./transfers_collection/index.js";
import wallet from "./wallet/index.js";

const router = new Hono();

router.route('/metadata', metadata);
router.route('/token', token);
router.route('/transfers_address', transfers_address);
router.route('/transfers_collection', transfers_collection);
router.route('/wallet', wallet);

export default router;
