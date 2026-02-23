-- holders_evm: ERC721 total supply subquery
-- Counts unique token_ids via GROUP BY (replaces FINAL)
SELECT count()
FROM (
    SELECT contract, token_id
    FROM {db_nft:Identifier}.erc721_owners
    WHERE contract = {contract:String}
    GROUP BY contract, token_id
)
