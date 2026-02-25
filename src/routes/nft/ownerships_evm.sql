/*
    Pre-narrow to only (contract, token_id) pairs where the target address has
    EVER appeared as an owner. Without this, the argMax aggregation runs on
    every single ERC721 token on mainnet (~100M+ groups) → ClickHouse timeout.
    HAVING is still needed because the address may have transferred the token
    away, so argMax(owner) could be someone else.
*/
WITH erc721_candidates AS (
    SELECT DISTINCT contract, token_id
    FROM {db_nft:Identifier}.erc721_owners
    WHERE owner IN {address:Array(String)}
      AND (empty({contract:Array(String)}) OR contract IN {contract:Array(String)})
),
erc721_deduped AS (
    SELECT
        contract,
        token_id,
        argMax(owner, global_sequence) AS owner
    FROM {db_nft:Identifier}.erc721_owners
    WHERE (contract, token_id) IN (SELECT contract, token_id FROM erc721_candidates)
    GROUP BY contract, token_id
    HAVING owner IN {address:Array(String)}
),
erc721 AS (
    SELECT
        o.owner AS address,
        o.contract,
        toString(o.token_id) AS token_id,
        'ERC721' AS token_standard,
        m.name,
        m.symbol,
        {network:String} AS network
    FROM erc721_deduped AS o
    LEFT JOIN (
        SELECT contract, argMax(name, block_num) AS name, argMax(symbol, block_num) AS symbol
        FROM {db_nft:Identifier}.erc721_metadata_by_contract
        WHERE (empty({contract:Array(String)}) OR contract IN {contract:Array(String)})
        GROUP BY contract
    ) AS m USING (contract)
),
erc1155_deduped AS (
    SELECT
        contract,
        token_id,
        owner,
        sum(balance) AS balance
    FROM {db_nft:Identifier}.erc1155_balances
    WHERE owner IN {address:Array(String)}
    AND (empty({contract:Array(String)}) OR contract IN {contract:Array(String)})
    GROUP BY contract, token_id, owner
    HAVING (balance > 0 OR {include_null_balances:Bool})
),
erc1155 AS (
    SELECT
        o.owner AS address,
        o.contract,
        toString(o.token_id) AS token_id,
        'ERC1155' AS token_standard,
        m.name,
        m.symbol,
        {network:String} AS network
    FROM erc1155_deduped AS o
    LEFT JOIN (
        SELECT contract, argMax(name, block_num) AS name, argMax(symbol, block_num) AS symbol
        FROM {db_nft:Identifier}.erc1155_metadata_by_contract
        WHERE (empty({contract:Array(String)}) OR contract IN {contract:Array(String)})
        GROUP BY contract
    ) AS m USING (contract)
),
combined AS (
    SELECT * FROM erc721
    UNION ALL
    SELECT * FROM erc1155
)
SELECT * FROM combined
WHERE (isNull({token_standard:Nullable(String)}) OR token_standard = {token_standard:Nullable(String)})
AND (empty({token_id:Array(String)}) OR token_id IN {token_id:Array(String)})
ORDER BY token_standard, contract, token_id
LIMIT {limit:UInt64}
OFFSET {offset:UInt64}
