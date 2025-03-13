SELECT
contract,
from,
to,
CAST(value, 'String') AS value,
toUnixTimestamp(timestamp) as timestamp,
date
FROM transfers
WHERE from = {address: String} OR to = {address: String}
ORDER BY block_num DESC;