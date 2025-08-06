SELECT
    block_num,
    b.timestamp AS datetime,
    toUnixTimestamp(b.timestamp) AS timestamp,
    toString(program_id) AS program_id,
    toString(account) AS token_account,
    toString(mint) AS mint,
    toString(b.amount) AS amount,
    b.amount / pow(10, decimals) AS value,
    if(
        mint = 'So11111111111111111111111111111111111111111',
        'SOL',
        if(
            mint = 'So11111111111111111111111111111111111111112',
            'Wrapped SOL',
            name
        )
    ) AS name,
    if(
        mint = 'So11111111111111111111111111111111111111111',
        'SOL',
        if(
            mint = 'So11111111111111111111111111111111111111112',
            'WSOL',
            symbol
        )
    ) AS symbol,
    decimals,
    {network_id:String} AS network_id
FROM balances AS b FINAL
LEFT JOIN metadata USING mint
WHERE ({token_account:String}     = '' OR account = {token_account:String})
    AND ({mint:String}            = '' OR mint = {mint:String})
    AND ({program_id:String}      = '' OR program_id = {program_id:String})
    AND b.amount > 0
ORDER BY account, mint
LIMIT  {limit:Int}
OFFSET {offset:Int};
