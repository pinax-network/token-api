SELECT
    /* primary */
    timestamp as datetime,
    address,

    /* OHLC */
    b.open / pow(10, decimals) AS open,
    b.high / pow(10, decimals) AS high,
    b.low / pow(10, decimals) AS low,
    b.close / pow(10, decimals) AS close,

    /* metadata */
    name,
    symbol,
    decimals,

    /* network */
    {network:String} AS network
FROM {db_balances:Identifier}.historical_native_balances as b
JOIN metadata.metadata AS m FINAL ON m.network = {network:String} AND m.contract = '0x0000000000000000000000000000000000000000'
WHERE
    /* required */
    interval_min = {interval:UInt32}
    AND address = {address:String}
    /* optional */
    AND (isNull({start_time:Nullable(UInt64)}) OR timestamp >= {start_time:Nullable(UInt64)}) AND (isNull({end_time:Nullable(UInt64)}) OR timestamp <= {end_time:Nullable(UInt64)})
ORDER BY timestamp DESC
LIMIT {limit:UInt64}
OFFSET {offset:UInt64}