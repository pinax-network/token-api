WITH erc721 AS (
    SELECT
        m.contract AS contract,
        c.timestamp AS contract_creation,
        c.creator AS contract_creator,
        'ERC721' AS token_standard,
        m.symbol,
        m.name,
        (
            SELECT
                count(token_id)
            FROM erc721_owners
            FINAL
            WHERE contract = {contract: String}
        ) AS total_supply,
        total_supply AS total_unique_supply,
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
        ) AS total_transfers,
        {network_id:String} as network_id
    FROM erc721_metadata_by_contract AS m
    FINAL
    LEFT JOIN `mainnet:evm-contracts@v0.3.1`.contracts AS c ON c.address = m.contract
    WHERE m.contract = {contract: String}
),
erc1155_metadata_by_contract AS (
    SELECT DISTINCT
        contract
    FROM erc1155_balances
    FINAL
),
erc1155 AS (
    SELECT
        {contract: String} AS contract,
        c.timestamp AS contract_creation,
        c.creator AS contract_creator,
        'ERC1155' AS token_standard,
        'TO IMPLEMENT OFFCHAIN' AS symbol,
        'TO IMPLEMENT OFFCHAIN' AS name,
        (
            SELECT
                count(token_id)
            FROM erc1155_balances
            FINAL
            WHERE contract = {contract: String} AND balance > 0
        ) AS total_supply,
        (
            SELECT
                uniq(token_id)
            FROM erc1155_balances
            FINAL
            WHERE contract = {contract: String} AND balance > 0
        ) AS total_unique_supply,
        (
            SELECT
                uniq(owner)
            FROM erc1155_balances
            FINAL
            WHERE contract = {contract: String} AND balance > 0
        ) AS owners,
        (
            SELECT
                count(*)
            FROM erc1155_transfers
            FINAL
            WHERE contract = {contract: String}
        ) AS total_transfers,
        {network_id:String} as network_id
    FROM erc1155_metadata_by_contract AS m
    LEFT JOIN `mainnet:evm-contracts@v0.3.1`.contracts AS c ON c.address = m.contract
    WHERE m.contract = {contract: String}
),
combined AS (
    SELECT * FROM erc721
    UNION ALL
    SELECT * FROM erc1155
)
SELECT * FROM combined