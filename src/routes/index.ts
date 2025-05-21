// routes/index.ts
import { Hono } from 'hono'
import nft from './nft/index.js'
import token from './token/index.js'
import health from './health.js'
import version from './version.js'
import networks from './networks.js'

const router = new Hono()

router.route('/nft', nft)
router.route('/', token)
router.route('/', health)
router.route('/', version)
router.route('/', networks)

export default router
