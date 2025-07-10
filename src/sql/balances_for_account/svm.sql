SELECT
    block_num,
    b.timestamp AS datetime,
    toUnixTimestamp(b.timestamp) AS timestamp,
    toString(program_id) AS program_id,
    toString(owner) AS token_account,
    toString(mint) AS mint,
    toString(b.amount) as amount,
    b.amount / pow(10, decimals) as value,
    decimals,
    {network_id: String} as network_id
FROM balances AS b
WHERE
    owner = {token_account:String}
    AND ({mint: String} = '' OR mint = {mint: String})
ORDER BY timestamp DESC
LIMIT {limit:int}
OFFSET {offset:int}