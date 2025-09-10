WITH owners AS (
    SELECT
        max(timestamp) AS last_update,
        max(block_num) AS last_update_block_num,
        argMax(owner, o.block_num) AS owner
    FROM owner_state_latest AS o
    WHERE account = {account:String}
    GROUP BY o.owner, account
)
SELECT
    last_update,
    last_update_block_num,
    toUnixTimestamp(last_update) AS last_update_timestamp,
    owner,
    (SELECT count() FROM owners) > 1 AS is_closed,
    {network_id:String} AS network_id
FROM owners
WHERE owner != ''
ORDER BY last_update DESC
LIMIT  {limit:UInt64}
OFFSET {offset:UInt64}