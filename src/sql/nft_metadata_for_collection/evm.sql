WITH erc721 AS (
    SELECT
        m.contract AS contract,
        'ERC721' AS token_standard,
        m.name,
        m.symbol,
        (
            SELECT
                count(token_id)
            FROM erc721_owners
            WHERE contract = {contract: String}
        ) AS total_supply,
        total_supply AS total_unique_supply,
        (
            SELECT
                uniq(owner)
            FROM erc721_owners
            WHERE contract = {contract: String}
        ) AS owners,
        (
            SELECT
                count(*)
            FROM erc721_transfers
            WHERE contract = {contract: String}
        ) AS total_transfers,
        {network_id:String} as network_id
    FROM erc721_metadata_by_contract AS m
    FINAL
    WHERE m.contract = {contract: String}
),
erc1155 AS (
    SELECT
        {contract: String} AS contract,
        'ERC1155' AS token_standard,
        m.name,
        m.symbol,
        (
            SELECT
                count(token_id)
            FROM erc1155_balances
            WHERE contract = {contract: String} AND balance > 0
        ) AS total_supply,
        (
            SELECT
                uniq(token_id)
            FROM erc1155_balances
            WHERE contract = {contract: String} AND balance > 0
        ) AS total_unique_supply,
        (
            SELECT
                uniq(owner)
            FROM erc1155_balances
            WHERE contract = {contract: String} AND balance > 0
        ) AS owners,
        (
            SELECT
                count(*)
            FROM erc1155_transfers
            WHERE contract = {contract: String}
        ) AS total_transfers,
        {network_id:String} as network_id
    FROM erc1155_metadata_by_contract AS m
    WHERE m.contract = {contract: String}
),
combined AS (
    SELECT * FROM erc721
    UNION ALL
    SELECT * FROM erc1155
),
contract_creation AS (
    SELECT
        address AS contract,
        timestamp,
        creator
    FROM `mainnet:evm-contracts@v0.3.1`.contracts
    WHERE address = {contract: String}
)
SELECT
    token_standard,
    contract,
    timestamp AS contract_creation,
    creator AS contract_creator,
    name,
    symbol,
    owners,
    total_supply,
    total_unique_supply,
    total_transfers,
    network_id
FROM combined
LEFT JOIN contract_creation USING (contract)