WITH owners AS (
    SELECT
        max(timestamp) AS last_update,
        max(block_num) AS last_update_block_num,
        account,
        argMax(owner, o.block_num) AS owner
    FROM owner_state_latest AS o
    WHERE account IN {account:Array(String)}
    GROUP BY o.owner, account
)
SELECT
    last_update,
    last_update_block_num,
    toUnixTimestamp(last_update) AS last_update_timestamp,
    account,
    owner,
    if((SELECT count() FROM owners) > 1, true, false) AS is_closed,
    {network:String} AS network
FROM owners
WHERE owner != ''
ORDER BY last_update DESC, account
LIMIT  {limit:UInt64}
OFFSET {offset:UInt64}