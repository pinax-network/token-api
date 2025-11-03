/* 1) Get the token metadata */
WITH
metadata AS (
    SELECT
         contract,
         decimals,
         name,
         symbol
    FROM metadata_view
    WHERE contract = {contract: String}
),
/* 2) Calculate the threshold based on the 99.995 percentile of the 1M sample size */
balance_stats AS (
    SELECT
        count(*) as total_count,
        /* when limit is higher we have to widen the threshold */
        quantileExact(1 - ({offset:UInt64} + {limit:UInt64}) * 0.000005)(balance) AS percentile_threshold
    FROM (
        SELECT balance
        FROM balances
        WHERE contract = {contract: String} AND balance > 0
        LIMIT 1000000
    )
),
/* 3) If not enough balances in the contract, pick 1 for threshold */
threshold AS (
    SELECT
        if(total_count < 1000000, 1, percentile_threshold) as min_balance
    FROM balance_stats
),
/* 4) Get the top balances based on the threshold we picked above */
top_balances AS (
    SELECT
        b.address as address,
        any(b.contract) as contract,
        argMax(b.balance, b.timestamp) as balance,
        max(b.timestamp) as timestamp,
        max(b.block_num) as block_num
    FROM balances AS b
    WHERE b.contract = {contract: String}
      AND b.balance >= (SELECT min_balance FROM threshold)
    GROUP BY address
    ORDER BY balance DESC, address
    LIMIT {limit:UInt64}
    OFFSET {offset:UInt64}
)
SELECT
    block_num AS last_update_block_num,
    toUnixTimestamp(a.timestamp) AS last_update_timestamp,
    toString(address) AS address,
    toString(contract) AS contract,
    toString(a.balance) AS amount,
    a.balance / pow(10, b.decimals) AS value,
    b.name,
    b.symbol,
    b.decimals,
    {network:String} as network
FROM top_balances AS a
LEFT JOIN metadata AS b USING contract
ORDER BY value DESC, address
