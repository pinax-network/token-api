WITH filtered_balances AS
(
    SELECT *
    FROM balances
    WHERE ({token_account:String}     = '' OR account = {token_account:String})
        AND ({mint:String}            = '' OR mint = {mint:String})
        AND ({program_id:String}      = '' OR program_id = {program_id:String})
        AND amount > 0
    ORDER BY program_id
    LIMIT  {limit:UInt64}
    OFFSET {offset:UInt64}
)
SELECT
    block_num,
    b.timestamp                         AS datetime,
    toUnixTimestamp(b.timestamp)        AS timestamp,
    toString(program_id)                AS program_id,
    toString(account)                     AS token_account,
    toString(mint)                      AS mint,
    toString(b.amount)                  AS amount,
    b.amount / pow(10, decimals)        AS value,
    decimals,
    {network_id:String}     AS network_id
FROM filtered_balances AS b
ORDER BY timestamp DESC
