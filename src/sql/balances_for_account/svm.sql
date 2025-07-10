WITH b AS (
    SELECT
        *,
        row_number() OVER (
            PARTITION BY owner, mint
            ORDER BY block_num DESC
        ) AS rn
    FROM balances
    WHERE owner = {token_account:String}
      AND ({mint:String} = '' OR mint = {mint:String})
)
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
FROM b
WHERE rn = 1
ORDER BY block_num DESC
LIMIT  {limit:Int}
OFFSET {offset:Int};
