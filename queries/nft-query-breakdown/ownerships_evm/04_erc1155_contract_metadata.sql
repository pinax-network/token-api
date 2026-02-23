-- ownerships_evm: ERC1155 contract metadata subquery
-- argMax dedup for name/symbol (replaces FINAL)
SELECT
    contract,
    argMax(name, block_num) AS name,
    argMax(symbol, block_num) AS symbol
FROM {db_nft:Identifier}.erc1155_metadata_by_contract
WHERE (empty({contract:Array(String)}) OR contract IN {contract:Array(String)})
GROUP BY contract
