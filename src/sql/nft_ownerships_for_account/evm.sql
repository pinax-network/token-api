WITH erc721 AS (
    SELECT DISTINCT
        o.owner AS address,
        o.contract,
        toString(o.token_id) AS token_id,
        o.token_standard,
        m.name,
        m.symbol,
        {network:String} AS network
    FROM (
        SELECT
            token_id,
            'ERC721' AS token_standard,
            contract,
            owner,
        FROM erc721_owners
        WHERE owner IN {address:Array(String)} AND ({contract:Array(String)} = [''] OR contract IN {contract:Array(String)})
    ) AS o
    LEFT JOIN erc721_metadata_by_contract AS m USING (contract)
),
erc1155 AS (
    SELECT DISTINCT
        o.owner AS address,
        o.contract,
        toString(o.token_id) AS token_id,
        o.token_standard,
        m.name,
        m.symbol,
        {network:String} AS network
    FROM (
        SELECT
            token_id,
            'ERC1155' AS token_standard,
            contract,
            owner,
        FROM erc1155_balances
        WHERE owner IN {address:Array(String)}
        AND ({contract:Array(String)} = [''] OR contract IN {contract:Array(String)})
        AND (balance > 0 OR {include_null_balances:Bool})
    ) AS o
    LEFT JOIN erc1155_metadata_by_contract AS m USING (contract)
),
combined AS (
    SELECT * FROM erc721
    UNION ALL
    SELECT * FROM erc1155
)
SELECT * FROM combined
WHERE ({token_standard:String} = '' OR token_standard = {token_standard:String})
AND ({token_id:Array(String)} = [''] OR token_id IN {token_id:Array(String)})
ORDER BY token_standard, contract, token_id
LIMIT {limit:UInt64}
OFFSET {offset:UInt64}