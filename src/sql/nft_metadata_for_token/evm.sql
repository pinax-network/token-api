SELECT
    token_id,
    'ERC721' AS token_standard,
    contract,
    m.symbol,
    o.owner AS owner,
    uri,
    'TO IMPLEMENT OFFCHAIN' AS name,
    'TO IMPLEMENT OFFCHAIN' AS description,
    'TO IMPLEMENT OFFCHAIN' AS image,
    'TO IMPLEMENT OFFCHAIN [{trait_type, value}]' AS attributes,
    {network_id:String} as network_id

FROM erc721_metadata_by_token AS t
FINAL
JOIN erc721_metadata_by_contract AS m USING (contract)
JOIN erc721_owners AS o USING (contract, token_id)
WHERE contract = {contract: String} AND token_id = {token_id: UInt256}