SELECT
    /* identifiers */
    m.contract AS contract,

    /* token metadata */
    m.name AS name,
    m.symbol AS symbol,
    m.decimals AS decimals,

    /* network */
    {network: String} AS network
FROM metadata.metadata AS m FINAL
WHERE m.network = {network: String}
  AND m.contract IN {contract: Array(String)}
ORDER BY m.contract
