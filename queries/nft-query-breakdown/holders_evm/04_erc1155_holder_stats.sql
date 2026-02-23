-- holders_evm: ERC1155 holder stats
-- sum aggregation + GROUP BY owner for quantity/unique_tokens
SELECT
    owner,
    sum(balance) AS quantity,
    uniq(token_id) AS unique_tokens
FROM (
    SELECT contract, token_id, owner, sum(balance) AS balance
    FROM {db_nft:Identifier}.erc1155_balances
    WHERE contract = {contract:String}
    GROUP BY contract, token_id, owner
    HAVING balance > 0
) AS b
GROUP BY owner
ORDER BY quantity DESC
LIMIT 100
