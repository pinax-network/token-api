import { Hono } from 'hono';
// Balances
import evmBalances from './balances/evm.js';
// import tvmBalancesNative from './balances/tvm_native.js';
import evmBalancesHistorical from './balances/evm_historical.js';
// import tvmBalancesHistorical from './balances/tvm_historical.js';
import evmBalancesHistoricalNative from './balances/evm_historical_native.js';
// import tvmBalances from './balances/tvm.js';
import evmBalancesNative from './balances/evm_native.js';
import svmBalances from './balances/svm.js';
import svmBalancesNative from './balances/svm_native.js';
// Monitoring
import health from './health.js';
import networks from './networks.js';
// Tokens
import evmTokens from './tokens/evm.js';
import evmTokensNative from './tokens/evm_native.js';
import svmTokens from './tokens/svm.js';
import tvmTokens from './tokens/tvm.js';
import tvmTokensNative from './tokens/tvm_native.js';
import version from './version.js';

// import tvmBalancesHistoricalNative from './balances/tvm_historical_native.js';

// DEXes
import evmDexes from './dexes/evm.js';
import svmDexes from './dexes/svm.js';
import tvmDexes from './dexes/tvm.js';
// Holders
import evmHolders from './holders/evm.js';
// import tvmHolders from './holders/tvm.js';
import evmHoldersNative from './holders/evm_native.js';
import svmHolders from './holders/svm.js';
// NFT
import nftCollections from './nft/collections_evm.js';
import nftHolders from './nft/holders_evm.js';
import nftItems from './nft/items_evm.js';
import nftOwnerships from './nft/ownerships_evm.js';
import nftSales from './nft/sales_evm.js';
import nftTransfers from './nft/transfers_evm.js';
// OHLCV
import evmOhlcv from './ohlcv/evm.js';
import svmOhlcv from './ohlcv/svm.js';
import tvmOhlcv from './ohlcv/tvm.js';
// Owner
import svmOwner from './owner/svm.js';
// Pools
import evmPools from './pools/evm.js';
import svmPools from './pools/svm.js';
import tvmPools from './pools/tvm.js';
// Swaps
import evmSwaps from './swaps/evm.js';
import svmSwaps from './swaps/svm.js';
import tvmSwaps from './swaps/tvm.js';
// Transfers
import evmTransfers from './transfers/evm.js';
import evmTransfersNative from './transfers/evm_native.js';
import svmTransfers from './transfers/svm.js';
import tvmTransfers from './transfers/tvm.js';
import tvmTransfersNative from './transfers/tvm_native.js';

const router = new Hono();

// Monitoring
router.route('/v1', health);
router.route('/v1', version);
router.route('/v1', networks);

// EVM
router.route('/v1/evm/tokens', evmTokens);
router.route('/v1/evm/tokens/native', evmTokensNative);
router.route('/v1/evm/balances', evmBalances);
router.route('/v1/evm/balances/native', evmBalancesNative);
router.route('/v1/evm/balances/historical', evmBalancesHistorical);
router.route('/v1/evm/balances/historical/native', evmBalancesHistoricalNative);
router.route('/v1/evm/transfers', evmTransfers);
router.route('/v1/evm/transfers/native', evmTransfersNative);
router.route('/v1/evm/holders', evmHolders);
router.route('/v1/evm/holders/native', evmHoldersNative);
router.route('/v1/evm/swaps', evmSwaps);
router.route('/v1/evm/dexes', evmDexes);
router.route('/v1/evm/pools', evmPools);
router.route('/v1/evm/pools/ohlc', evmOhlcv);
router.route('/v1/evm/nft/collections', nftCollections);
router.route('/v1/evm/nft/holders', nftHolders);
router.route('/v1/evm/nft/items', nftItems);
router.route('/v1/evm/nft/ownerships', nftOwnerships);
router.route('/v1/evm/nft/sales', nftSales);
router.route('/v1/evm/nft/transfers', nftTransfers);

// SVM
router.route('/v1/svm/tokens', svmTokens);
router.route('/v1/svm/balances', svmBalances);
router.route('/v1/svm/balances/native', svmBalancesNative);
router.route('/v1/svm/transfers', svmTransfers);
router.route('/v1/svm/holders', svmHolders);
router.route('/v1/svm/swaps', svmSwaps);
router.route('/v1/svm/dexes', svmDexes);
router.route('/v1/svm/pools', svmPools);
router.route('/v1/svm/pools/ohlc', svmOhlcv);
router.route('/v1/svm/owner', svmOwner);

// TVM
router.route('/v1/tvm/tokens', tvmTokens);
router.route('/v1/tvm/tokens/native', tvmTokensNative);
// router.route('/v1/tvm/balances', tvmBalances);
// router.route('/v1/tvm/balances/native', tvmBalancesNative);
// router.route('/v1/tvm/balances/historical', tvmBalancesHistorical);
// router.route('/v1/tvm/balances/historical/native', tvmBalancesHistoricalNative);
router.route('/v1/tvm/transfers', tvmTransfers);
router.route('/v1/tvm/transfers/native', tvmTransfersNative);
// router.route('/v1/tvm/holders', tvmHolders);
router.route('/v1/tvm/swaps', tvmSwaps);
router.route('/v1/tvm/dexes', tvmDexes);
router.route('/v1/tvm/pools', tvmPools);
router.route('/v1/tvm/pools/ohlc', tvmOhlcv);

export default router;
