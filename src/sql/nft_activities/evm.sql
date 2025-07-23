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
        token_id,
        amount,
        transfer_type,
        token_standard
    FROM erc721_transfers AS t
    WHERE timestamp BETWEEN {startTime: UInt64} AND {endTime: UInt64}
        AND contract = {contract:String}
        AND ({fromAddress:String}       = '' OR from           = {fromAddress:String})
        AND ({toAddress:String}         = '' OR to             = {toAddress:String})
        AND ({anyAddress:String}        = '' OR (to = {anyAddress:String} OR from = {anyAddress:String}))
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
        token_id,
        amount,
        transfer_type,
        token_standard
    FROM erc1155_transfers AS t
    WHERE timestamp BETWEEN {startTime: UInt64} AND {endTime: UInt64}
        AND contract = {contract:String}
        AND ({fromAddress:String}       = '' OR from           = {fromAddress:String})
        AND ({toAddress:String}         = '' OR to             = {toAddress:String})
        AND ({anyAddress:String}        = '' OR (to = {anyAddress:String} OR from = {anyAddress:String}))
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
    LIMIT {limit:int}
    OFFSET {offset:int}
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
    tx_hash,
    token_standard,
    contract,
    if(length(m.name) > 0, m.name, m2.name) AS name,
    if(length(m.symbol) > 0, m.symbol, m2.symbol) AS symbol,
    from,
    to,
    toString(token_id) AS token_id,
    amount,
    transfer_type
FROM limit_combined AS c
LEFT JOIN erc721_metadata_by_contract AS m USING (contract)
LEFT JOIN erc1155_metadata_by_contract AS m2 USING (contract)
ORDER BY c.timestamp DESC