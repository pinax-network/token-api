SELECT
    block_num,
    b.timestamp                     AS datetime,
    toUnixTimestamp(b.timestamp)    AS timestamp,
    program_id,
    account                         AS token_account,
    mint,
    amount,
    decimals,
    amount /
    CASE
        WHEN decimals IS NOT NULL THEN pow(10, decimals)
        WHEN mint = 'So11111111111111111111111111111111111111111' THEN pow(10, 9)
        ELSE 1
    END AS value,
    {network_id:String}     AS network_id
FROM balances AS b FINAL
WHERE   ({token_account:String} = '' OR account = {token_account:String})
    AND ({mint:String} = '' OR mint = {mint:String})
    AND ({program_id:String} = '' OR program_id = {program_id:String})
ORDER BY account
    LIMIT {limit:UInt64}
OFFSET {offset:UInt64};
