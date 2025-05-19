SELECT
    m.contract AS contract,
    c.timestamp AS contract_creation,
    c.creator AS contract_creator,
    m.symbol,
    m.name,
    m.base_uri,
    (
        SELECT
            uniq(token_id)
        FROM erc721_owners
        FINAL
        WHERE contract = {contract: String}
    ) AS total_supply,
    (
        SELECT
            uniq(owner)
        FROM erc721_owners
        FINAL
        WHERE contract = {contract: String}
    ) AS owners,
    (
        SELECT
            count(*)
        FROM erc721_transfers
        FINAL
        WHERE contract = {contract: String}
    ) AS total_transfers
FROM erc721_metadata_by_contract AS m
FINAL
LEFT JOIN `mainnet:evm-contracts@v0.3.1`.contracts AS c ON c.address = m.contract
WHERE m.contract = {contract: String}