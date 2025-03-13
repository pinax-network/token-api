SELECT
contract,
CAST(new_balance, 'String') AS amount,
toUnixTimestamp(timestamp) as timestamp,
date
FROM balances
WHERE owner = {address: String} AND new_balance > 0
ORDER BY block_num DESC;