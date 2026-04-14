WITH owners AS (
    SELECT owner, account
    FROM {db_accounts:Identifier}.owner_state AS o
    WHERE owner IN {owner:Array(String)}
),
balances AS
(
    SELECT
        max(b.block_num) AS block_num,
        max(b.timestamp) AS timestamp,
        program_id,
        account,
        argMax(b.amount, b.block_num) AS amount,
        mint,
        decimals
    FROM {db_balances:Identifier}.balances AS b
    WHERE account IN (SELECT account FROM owners)
        AND (empty({token_account:Array(String)}) OR b.account IN {token_account:Array(String)})
        AND (empty({mint:Array(String)}) OR b.mint IN {mint:Array(String)})
        AND (isNull({program_id:Nullable(String)}) OR b.program_id = {program_id:Nullable(String)})
    GROUP BY program_id, account, mint, decimals
    HAVING {include_null_balances:Bool} OR amount > 0
    ORDER BY timestamp DESC, account, mint
    LIMIT  {limit:UInt64}
    OFFSET {offset:UInt64}
),
mints AS (
    SELECT DISTINCT mint FROM balances
),
metadata_mint_state AS (
    SELECT mint, metadata
    FROM {db_metadata:Identifier}.metadata_mint_state
    WHERE mint IN (SELECT mint FROM mints)
),
decimals_state AS (
    SELECT mint, decimals
    FROM {db_accounts:Identifier}.decimals_state FINAL
    WHERE mint IN (SELECT mint FROM mints)
),
metadata_name_state AS (
    SELECT metadata, name
    FROM {db_metadata:Identifier}.metadata_name_state FINAL
    WHERE metadata IN (SELECT metadata FROM metadata_mint_state)
),
metadata_symbol_state AS (
    SELECT metadata, symbol
    FROM {db_metadata:Identifier}.metadata_symbol_state FINAL
    WHERE metadata IN (SELECT metadata FROM metadata_mint_state)
),
metadata_uri_state AS (
    SELECT metadata, uri
    FROM {db_metadata:Identifier}.metadata_uri_state FINAL
    WHERE metadata IN (SELECT metadata FROM metadata_mint_state)
),
metadata_state AS (
    SELECT
        mm.mint,
        mm.metadata as metadata,
        n.name,
        s.symbol,
        u.uri
    FROM metadata_mint_state AS mm
    LEFT JOIN metadata_name_state AS n ON mm.metadata = n.metadata
    LEFT JOIN metadata_symbol_state AS s ON mm.metadata = s.metadata
    LEFT JOIN metadata_uri_state AS u ON mm.metadata = u.metadata
)
SELECT
    /* block */
    b.timestamp AS last_update,
    b.block_num AS last_update_block_num,
    toUnixTimestamp(b.timestamp) AS last_update_timestamp,

    /* balance */
    b.program_id as program_id,
    o.owner as owner,
    b.account as account,
    b.mint as mint,

    /* amount */
    b.amount AS amount,
    b.amount / pow(10, coalesce(b.decimals, d.decimals, 1)) AS value,
    coalesce(b.decimals, d.decimals) AS decimals,

    /* metadata */
    coalesce(m.name, '') AS name,
    coalesce(m.symbol, '') AS symbol,
    coalesce(m.uri, '') AS uri,

    /* network */
    {network:String} AS network
FROM balances AS b
LEFT JOIN owners AS o USING (account)
LEFT JOIN decimals_state AS d USING (mint)
LEFT JOIN metadata_state AS m USING (mint)
ORDER BY b.timestamp DESC, b.account, b.mint
