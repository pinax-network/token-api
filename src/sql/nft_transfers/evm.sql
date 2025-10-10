WITH erc721 AS (
    SELECT
        CASE
            WHEN lower(from) IN (
                '0x0000000000000000000000000000000000000000',
                '0x000000000000000000000000000000000000dead'
            ) THEN 'MINT'
            WHEN lower(to) IN (
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
    FROM erc721_transfers AS t
    WHERE timestamp BETWEEN {start_time: UInt64} AND {end_time: UInt64}
        AND block_num BETWEEN {start_block: UInt64} AND {end_block: UInt64}
        AND ({transaction_id:Array(String)} = [''] OR tx_hash IN {transaction_id:Array(String)})
        AND ({contract:Array(String)} = [''] OR contract IN {contract:Array(String)})
        AND ({token_id:Array(String)} = [''] OR token_id IN {token_id:Array(String)})
        AND ({address:Array(String)} = [''] OR (from IN {address:Array(String)} OR to IN {address:Array(String)}))
        AND ({from_address:Array(String)} = [''] OR from IN {from_address:Array(String)})
        AND ({to_address:Array(String)} = [''] OR to IN {to_address:Array(String)})
),
erc1155 AS (
    SELECT
        CASE
            WHEN lower(from) IN (
                '0x0000000000000000000000000000000000000000',
                '0x000000000000000000000000000000000000dead'
            ) THEN 'MINT'
            WHEN lower(to) IN (
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
    FROM erc1155_transfers AS t
    WHERE timestamp BETWEEN {start_time: UInt64} AND {end_time: UInt64}
        AND block_num BETWEEN {start_block: UInt64} AND {end_block: UInt64}
        AND ({transaction_id:Array(String)} = [''] OR tx_hash IN {transaction_id:Array(String)})
        AND ({contract:Array(String)} = [''] OR contract IN {contract:Array(String)})
        AND ({token_id:Array(String)} = [''] OR token_id IN {token_id:Array(String)})
        AND ({address:Array(String)} = [''] OR (from IN {address:Array(String)} OR to IN {address:Array(String)}))
        AND ({from_address:Array(String)} = [''] OR from IN {from_address:Array(String)})
        AND ({to_address:Array(String)} = [''] OR to IN {to_address:Array(String)})
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
    FROM erc721_metadata_by_contract
    WHERE contract = {contract:String}
),
erc1155_metadata_by_contract AS (
    SELECT DISTINCT
        contract,
        name,
        symbol
    FROM erc721_metadata_by_contract
    WHERE contract = {contract:String}
)
SELECT
    `@type`,
    c.block_num,
    c.block_hash,
    c.timestamp,
    tx_hash AS transaction_id,
    token_standard,
    contract,
    if(length(m.name) > 0, m.name, m2.name) AS name,
    if(length(m.symbol) > 0, m.symbol, m2.symbol) AS symbol,
    from,
    to,
    toString(token_id) AS token_id,
    amount,
    transfer_type,
    {network:String} as network
FROM limit_combined AS c
LEFT JOIN erc721_metadata_by_contract AS m USING (contract)
LEFT JOIN erc1155_metadata_by_contract AS m2 USING (contract)
ORDER BY c.timestamp DESC