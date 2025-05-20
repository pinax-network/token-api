SELECT
    timestamp,
    block_num AS block_number,
    tx_hash AS transaction_hash,
    offer_token_id AS token_id,
    offerer AS `from`,
    recipient AS `to`,
    if (consideration_token  = '0x0000000000000000000000000000000000000000',
        toDecimal256(sum(consideration_amount), 18) / toDecimal256(1000000000000000000, 0),
        toDecimal256(sum(consideration_amount), 18)
    ) AS sale_amount,
    if (consideration_token  = '0x0000000000000000000000000000000000000000', 'ETH', consideration_token) AS sale_currency
FROM seaport_orders
WHERE offer_token = {contract: String}
GROUP BY timestamp, block_num, tx_hash, offerer, recipient, offer_token_id, consideration_token
ORDER BY timestamp DESC
LIMIT {limit:int}
OFFSET {offset:int}