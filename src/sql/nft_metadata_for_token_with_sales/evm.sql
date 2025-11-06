WITH last_token_sale AS (
    SELECT
        offer_token,
        offer_token_id,
        consideration_token,
        sum(consideration_amount) AS consideration_amount,
        timestamp AS last_sale
    FROM seaport_orders
    WHERE offer_token = {contract: String} AND offer_token_id = {token_id: UInt256}
    GROUP BY timestamp, offer_token, offer_token_id, consideration_token
    ORDER BY timestamp DESC
    LIMIT 1
),
last_collection_sale AS (
    SELECT
        offer_token,
        offer_token_id,
        consideration_token,
        sum(consideration_amount) AS consideration_amount,
        timestamp AS last_collection_sale
    FROM seaport_orders
    WHERE offer_token = {contract: String}
    GROUP BY timestamp, offer_token, offer_token_id, consideration_token
    ORDER BY timestamp DESC
    LIMIT 1
)
SELECT
    t.contract AS contract,
    c.timestamp AS contract_creation,
    c.from AS contract_creator,
    m.symbol,
    m.name,
    toString(token_id) AS token_id,
    last_sale,
    if (token.consideration_token  = '0x0000000000000000000000000000000000000000',
        toDecimal256(token.consideration_amount, 18) / toDecimal256(1000000000000000000, 0),
        toDecimal256(token.consideration_amount, 18)
    ) AS last_sale_amount,
    if (token.consideration_token  = '0x0000000000000000000000000000000000000000', 'ETH', '') AS last_sale_currency,
    last_collection_sale,
    if (collection.consideration_token  = '0x0000000000000000000000000000000000000000',
        toDecimal256(collection.consideration_amount, 18) / toDecimal256(1000000000000000000, 0),
        toDecimal256(collection.consideration_amount, 18)
    ) AS last_collection_sale_amount,
    if (collection.consideration_token  = '0x0000000000000000000000000000000000000000', 'ETH', '') AS last_collection_sale_currency,
    uri AS token_data
FROM erc721_metadata_by_token AS t
FINAL
LEFT JOIN erc721_metadata_by_contract AS m ON m.contract = t.contract
LEFT JOIN {db_evm_contracts:Identifier}.contracts AS c ON c.address = t.contract
LEFT JOIN last_token_sale AS token ON token.offer_token = t.contract AND token.offer_token_id = t.token_id
LEFT JOIN last_collection_sale AS collection ON collection.offer_token = t.contract
WHERE contract = {contract: String} AND t.token_id = {token_id: UInt256}