WITH
erc721_stats AS (
    SELECT
        contract,
        uniq(token_id) AS total_supply,
        uniq(owner) AS owners
    FROM erc721_owners FINAL
    WHERE contract = {contract: String}
    GROUP BY contract
),
erc721_transfer_stats AS (
    SELECT
        contract,
        uniq(global_sequence) AS total_transfers
    FROM erc721_transfers FINAL
    WHERE contract = {contract: String}
    GROUP BY contract
),
erc721 AS (
    SELECT
        m.contract AS contract,
        'ERC721' AS token_standard,
        m.name,
        m.symbol,
        s.total_supply,
        s.total_supply AS total_unique_supply,
        s.owners,
        t.total_transfers,
        {network:String} AS network
    FROM erc721_metadata_by_contract AS m FINAL
    LEFT JOIN erc721_stats s ON m.contract = s.contract
    LEFT JOIN erc721_transfer_stats t ON m.contract = t.contract
    WHERE m.contract = {contract: String}
),
erc1155_stats AS (
    SELECT
        contract,
        uniq(token_id) AS total_unique_supply,
        sum(balance) AS total_supply,
        uniq(owner) AS owners
    FROM erc1155_balances FINAL
    WHERE contract = {contract: String} AND balance > 0
    GROUP BY contract
),
erc1155_transfer_stats AS (
    SELECT
        contract,
        uniq(global_sequence) AS total_transfers
    FROM erc1155_transfers FINAL
    WHERE contract = {contract: String}
    GROUP BY contract
),
erc1155 AS (
    SELECT
        {contract: String} AS contract,
        'ERC1155' AS token_standard,
        m.name,
        m.symbol,
        s.total_supply,
        s.total_unique_supply,
        s.owners,
        t.total_transfers,
        {network:String} AS network
    FROM erc1155_metadata_by_contract AS m FINAL
    LEFT JOIN erc1155_stats s ON m.contract = s.contract
    LEFT JOIN erc1155_transfer_stats t ON m.contract = t.contract
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
        `from` AS creator
    FROM `{contracts_db}`.contracts
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
    network
FROM combined
LEFT JOIN contract_creation USING (contract)
