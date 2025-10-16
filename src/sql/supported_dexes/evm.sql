SELECT
    toString(factory) AS factory,
    protocol,
    sum(uaw) AS total_uaw,
    sum(transactions) AS total_transactions
FROM pool_activity_summary
WHERE ({factory:Array(String)} = [''] OR factory IN {factory:Array(String)})
AND ({protocol:String} = '' OR protocol IN {protocol:String})
GROUP BY
    factory, protocol
ORDER BY total_uaw DESC, total_transactions DESC
LIMIT   {limit:UInt64}
OFFSET  {offset:UInt64}