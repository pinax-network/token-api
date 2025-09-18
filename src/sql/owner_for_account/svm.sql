SELECT
    *,
    {network_id:String} AS network_id
FROM accounts
WHERE account = {account:String}
LIMIT  {limit:UInt64}
OFFSET {offset:UInt64}