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
    t.uri,
    'TO IMPLEMENT OFFCHAIN' AS name,
    'TO IMPLEMENT OFFCHAIN' AS description,
    'TO IMPLEMENT OFFCHAIN' AS image,
    'TO IMPLEMENT OFFCHAIN [{trait_type, value}]' AS attributes,
    {network_id:String} as network_id
FROM ownerships AS o
INNER JOIN erc721_metadata_by_contract AS m USING (contract)
INNER JOIN erc721_metadata_by_token AS t ON t.contract = o.contract AND t.token_id = o.token_id
LIMIT {limit:int}
OFFSET {offset:int}