-- holders_evm: ERC721 holder stats
-- argMax dedup + GROUP BY owner for quantity/unique_tokens
SELECT
    owner,
    count() AS quantity,
    uniq(token_id) AS unique_tokens
FROM (
    SELECT
        contract,
        token_id,
        argMax(owner, global_sequence) AS owner
    FROM {db_nft:Identifier}.erc721_owners
    WHERE contract = {contract:String}
    GROUP BY contract, token_id
) AS o
GROUP BY owner
ORDER BY quantity DESC
LIMIT 100
