# Changelog

## [3.5.3] - 2024-11-07

### Fixed

- Fix tron order by, include `block_hash` ([#265](https://github.com/pinax-network/token-api/pull/265))

## [3.5.2] - 2024-11-06

### Fixed

- Fix TVM ORDER BY for swaps and transfers ([#263](https://github.com/pinax-network/token-api/pull/263))

## [3.5.1] - 2024-11-05

### Added

- Add indexes to TVM endpoint responses ([#262](https://github.com/pinax-network/token-api/pull/262))

## [3.5.0] - 2024-11-04

### Added

- Add TVM endpoints ([#256](https://github.com/pinax-network/token-api/pull/256))

### Changed

- Optimize query time windows to use latest ingested timestamp ([#258](https://github.com/pinax-network/token-api/pull/258))
- Refactor spam scoring ([#259](https://github.com/pinax-network/token-api/pull/259))

## [3.4.1] - 2024-10-31

### Fixed

- Fix sorting in `/evm/holders` ([#255](https://github.com/pinax-network/token-api/pull/255))

### Changed

- Optimize `/evm/holders` ([#257](https://github.com/pinax-network/token-api/pull/257))

## [3.4.0] - 2024-10-30

**Breaking**: This version requires new materialized views in the EVM and Solana schemas.

### Added

- Add version mismatch check for GH release action ([#252](https://github.com/pinax-network/token-api/pull/252))

### Changed

- Optimize `/evm/transfers` ([#250](https://github.com/pinax-network/token-api/pull/250))
- Optimize `/svm/swaps` ([#253](https://github.com/pinax-network/token-api/pull/253))
- Optimize `/evm/swaps` ([#254](https://github.com/pinax-network/token-api/pull/254))

## [3.3.3] - 2024-10-28

### Added

- Added SOL native token metadata to `/svm/transfers`

## [3.3.2] - 2024-10-27

### Fixed

- Minor bug fixes
