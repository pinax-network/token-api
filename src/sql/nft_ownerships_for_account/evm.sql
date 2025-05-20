WITH ownerships AS (
    SELECT
        token_id,
        'ERC721' AS token_standard,
        contract,
        owner,
    FROM erc721_owners
    WHERE owner = lower({address: String})
)
SELECT
    o.token_id,
    o.token_standard,
    o.contract,
    o.owner AS owner,
    m.symbol,
    m.name,
    {network_id:String} as network_id
FROM ownerships AS o
JOIN erc721_metadata_by_contract AS m USING (contract)
LIMIT {limit:int}
OFFSET {offset:int}