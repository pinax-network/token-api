WITH erc721 AS (
    SELECT
        CASE
            WHEN from IN (
                '0x0000000000000000000000000000000000000000',
                '0x000000000000000000000000000000000000dead'
            ) THEN 'MINT'
            WHEN to IN (
                '0x0000000000000000000000000000000000000000',
                '0x000000000000000000000000000000000000dead'
            ) THEN 'BURN'
            ELSE 'TRANSFER'
        END AS "@type",
        block_num,
        block_hash,
        timestamp,
        tx_hash,
        contract,
        from,
        to,
        toString(token_id) AS token_id,
        amount,
        transfer_type,
        token_standard
    FROM {db_nft:Identifier}.erc721_transfers AS t
    WHERE (isNull({start_time:Nullable(UInt64)}) OR timestamp >= {start_time:Nullable(UInt64)}) AND (isNull({end_time:Nullable(UInt64)}) OR timestamp <= {end_time:Nullable(UInt64)})
        AND (isNull({start_block:Nullable(UInt64)}) OR block_num >= {start_block:Nullable(UInt64)}) AND (isNull({end_block:Nullable(UInt64)}) OR block_num <= {end_block:Nullable(UInt64)})
        AND (isNull({type:Nullable(String)}) OR `@type` = {type:Nullable(String)})
        AND (empty({transaction_id:Array(String)}) OR tx_hash IN {transaction_id:Array(String)})
        AND (empty({contract:Array(String)}) OR contract IN {contract:Array(String)})
        AND (empty({token_id:Array(String)}) OR token_id IN {token_id:Array(String)})
        AND (empty({address:Array(String)}) OR (from IN {address:Array(String)} OR to IN {address:Array(String)}))
        AND (empty({from_address:Array(String)}) OR from IN {from_address:Array(String)})
        AND (empty({to_address:Array(String)}) OR to IN {to_address:Array(String)})
),
erc1155 AS (
    SELECT
        CASE
            WHEN from IN (
                '0x0000000000000000000000000000000000000000',
                '0x000000000000000000000000000000000000dead'
            ) THEN 'MINT'
            WHEN to IN (
                '0x0000000000000000000000000000000000000000',
                '0x000000000000000000000000000000000000dead'
            ) THEN 'BURN'
            ELSE 'TRANSFER'
        END AS "@type",
        block_num,
        block_hash,
        timestamp,
        tx_hash,
        contract,
        from,
        to,
        toString(token_id) AS token_id,
        amount,
        transfer_type,
        token_standard
    FROM {db_nft:Identifier}.erc1155_transfers AS t
    WHERE (isNull({start_time:Nullable(UInt64)}) OR timestamp >= {start_time:Nullable(UInt64)}) AND (isNull({end_time:Nullable(UInt64)}) OR timestamp <= {end_time:Nullable(UInt64)})
        AND (isNull({start_block:Nullable(UInt64)}) OR block_num >= {start_block:Nullable(UInt64)}) AND (isNull({end_block:Nullable(UInt64)}) OR block_num <= {end_block:Nullable(UInt64)})
        AND (empty({transaction_id:Array(String)}) OR tx_hash IN {transaction_id:Array(String)})
        AND (empty({contract:Array(String)}) OR contract IN {contract:Array(String)})
        AND (empty({token_id:Array(String)}) OR token_id IN {token_id:Array(String)})
        AND (empty({address:Array(String)}) OR (from IN {address:Array(String)} OR to IN {address:Array(String)}))
        AND (empty({from_address:Array(String)}) OR from IN {from_address:Array(String)})
        AND (empty({to_address:Array(String)}) OR to IN {to_address:Array(String)})
),
combined AS (
    SELECT * FROM erc721
    UNION ALL
    SELECT * FROM erc1155
),
limit_combined AS (
    SELECT *
    FROM combined
    ORDER BY timestamp DESC
    LIMIT {limit:UInt64}
    OFFSET {offset:UInt64}
),
erc721_metadata_by_contract AS (
    SELECT DISTINCT
        contract,
        name,
        symbol
    FROM {db_nft:Identifier}.erc721_metadata_by_contract
    WHERE (empty({contract:Array(String)}) OR contract IN {contract:Array(String)})
),
erc1155_metadata_by_contract AS (
    SELECT DISTINCT
        contract,
        name,
        symbol
    FROM {db_nft:Identifier}.erc1155_metadata_by_contract
    WHERE (empty({contract:Array(String)}) OR contract IN {contract:Array(String)})
)
SELECT
    c.block_num,
    c.timestamp AS datetime,
    toUnixTimestamp(c.timestamp) AS timestamp,
    `@type`,
    transfer_type,
    tx_hash AS transaction_id,
    contract,
    toString(token_id) AS token_id,
    if(length(m.name) > 0, m.name, m2.name) AS name,
    if(length(m.symbol) > 0, m.symbol, m2.symbol) AS symbol,
    token_standard,
    from,
    to,
    amount,
    {network:String} as network
FROM limit_combined AS c
LEFT JOIN erc721_metadata_by_contract AS m USING (contract)
LEFT JOIN erc1155_metadata_by_contract AS m2 USING (contract)
ORDER BY c.timestamp DESC
