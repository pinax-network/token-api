SELECT
    block_num,
    b.timestamp                         AS datetime,
    toUnixTimestamp(b.timestamp)        AS timestamp,
    toString(program_id)                AS program_id,
    toString(owner)                     AS token_account,
    toString(mint)                      AS mint,
    toString(b.amount)                  AS amount,
    b.amount / pow(10, decimals)        AS value,
    decimals,
    {network_id:String}     AS network_id
FROM balances AS b FINAL
WHERE ({token_account:String}     = '' OR owner = {token_account:String})
    AND ({mint:String}            = '' OR mint = {mint:String})
    AND ({program_id:String}      = '' OR program_id = {program_id:String})
    AND b.amount > 0
ORDER BY owner, mint
LIMIT  {limit:UInt64}
OFFSET {offset:UInt64};
