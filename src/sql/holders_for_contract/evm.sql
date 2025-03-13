SELECT
owner as address,
CAST(new_balance, 'String') AS amount,
toUnixTimestamp(timestamp) as timestamp,
date
FROM balances
WHERE contract = {contract: String} AND new_balance > 0
ORDER BY amount DESC;