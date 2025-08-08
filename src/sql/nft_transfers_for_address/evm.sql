SELECT DISTINCT
    block_num,
    block_hash,
    timestamp,
    tx_hash,
    ordinal,
    index,
    global_sequence,
    contract,
    symbol,
    name,
    from,
    to,
    toString(token_id) AS token_id,
    amount,
    transfer_type,
    token_standard
FROM (
    SELECT *
    FROM erc721_transfers
    WHERE from = {address: String}
    UNION ALL
    SELECT *
    FROM erc1155_transfers
    WHERE to = {address: String}
) AS t
LEFT JOIN erc721_metadata_by_contract AS m ON m.contract = t.contract
ORDER BY timestamp DESC
LIMIT {limit:UInt64}
OFFSET {offset:UInt64}