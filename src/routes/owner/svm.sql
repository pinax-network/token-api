SELECT
    max(timestamp) AS last_update,
    max(block_num) AS last_update_block_num,
    toUnixTimestamp(max(timestamp)) AS last_update_timestamp,
    account,
    argMax(owner, block_num) AS owner,
    {network:String} AS network
FROM {db_accounts:Identifier}.owner_state o
WHERE o.account IN {account:Array(String)}
GROUP BY o.owner, o.account
HAVING owner != ''
ORDER BY last_update DESC, account
LIMIT  {limit:UInt64}
OFFSET {offset:UInt64}
