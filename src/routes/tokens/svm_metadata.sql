WITH metadata AS
(
    SELECT mint, name, symbol, uri
    FROM {db_metadata:Identifier}.metadata
    WHERE mint IN {mint:Array(String)}
    LIMIT 1 BY mint
),
decimals AS
(
    SELECT mint, decimals
    FROM {db_accounts:Identifier}.decimals_state
    WHERE mint IN {mint:Array(String)}
    LIMIT 1 BY mint
)
SELECT
    /* identifiers */
    toString(mint) AS mint,

    /* metadata */
    d.decimals AS decimals,
    m.name AS name,
    m.symbol AS symbol,
    m.uri AS uri,

    {network:String} AS network
FROM (
    SELECT mint FROM metadata
    UNION DISTINCT
    SELECT mint FROM decimals
) AS mints
LEFT JOIN metadata AS m USING mint
LEFT JOIN decimals AS d USING mint
ORDER BY mint
