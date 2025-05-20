WITH owned_erc721 AS (
    SELECT
        contract,
        token_id
    FROM erc721_owners
    WHERE owner = {address: String}
),
last_token_sales AS (
    SELECT
        offer_token,
        offer_token_id,
        consideration_token,
        sum(consideration_amount) AS consideration_amount,
        timestamp AS last_sale
    FROM seaport_orders
    WHERE (offer_token, offer_token_id) IN (
        SELECT contract, token_id FROM owned_erc721
    )
    GROUP BY timestamp, offer_token, offer_token_id, consideration_token
    ORDER BY timestamp DESC
)
SELECT DISTINCT
    o.contract AS contract,
    m.symbol,
    m.name,
    o.token_id,
    s.last_sale,
    if (s.consideration_token  = '0x0000000000000000000000000000000000000000',
        toDecimal256(s.consideration_amount, 18) / toDecimal256(1000000000000000000, 0),
        toDecimal256(s.consideration_amount, 18)
    ) AS last_sale_amount,
    if (s.consideration_token  = '0x0000000000000000000000000000000000000000', 'ETH', '') AS last_sale_currency
FROM owned_erc721 AS o
INNER JOIN erc721_metadata_by_contract AS m ON m.contract = o.contract
INNER JOIN last_token_sales AS s ON s.offer_token = o.contract AND s.offer_token_id = o.token_id
ORDER BY last_sale DESC
LIMIT {limit:int}
OFFSET {offset:int}