WITH accounts AS (
    SELECT DISTINCT
        owner,
        argMax(account, o.block_num) AS account
    FROM owner_state_latest AS o
    WHERE ({token_account:Array(String)} = [''] or o.account IN {token_account:Array(String)})
      AND owner IN {owner:Array(String)}
    GROUP BY owner, o.account
),
mints AS (
    SELECT DISTINCT mint
    FROM (
        SELECT arrayJoin({mint:Array(String)}) AS mint
        WHERE {mint:Array(String)} != ['']

        UNION ALL

        SELECT mint
        FROM mint_state_latest
        WHERE {mint:Array(String)} = [''] 
          AND account IN (SELECT account FROM accounts)
    )
    WHERE mint != ''
),
filtered_balances AS
(
    SELECT
        max(block_num) AS block_num,
        max(timestamp) AS timestamp,
        program_id,
        owner,
        account,
        argMax(amount, b.block_num) AS amount,
        mint,
        any(decimals) AS decimals
    FROM balances AS b
    LEFT JOIN accounts USING account
    WHERE mint IN (SELECT mint FROM mints)
        AND mint != 'So11111111111111111111111111111111111111111'
        AND account IN (SELECT account FROM accounts)
        AND ({program_id:String} = '' OR program_id = {program_id:String})
        AND (b.amount > 0 OR {include_null_balances:Bool})
    GROUP BY program_id, owner, account, mint
    ORDER BY timestamp DESC, owner, account, mint
    LIMIT  {limit:UInt64}
    OFFSET {offset:UInt64}
),
metadata AS
(
    SELECT
        mint,
        if(empty(name), NULL, name) AS name,
        if(empty(symbol), NULL, symbol) AS symbol,
        if(empty(uri), NULL, uri) AS uri
    FROM metadata_view
    WHERE metadata IN (
        SELECT metadata
        FROM metadata_mint_state_latest
        WHERE mint IN (SELECT mint FROM filtered_balances)
        GROUP BY metadata
    )
)
SELECT
    b.timestamp AS last_update,
    block_num AS last_update_block_num,
    toUnixTimestamp(b.timestamp) AS last_update_timestamp,
    toString(program_id) AS program_id,
    toString(owner) AS owner,
    toString(account) AS token_account,
    toString(mint) AS mint,
    toString(b.amount) AS amount,
    b.amount / pow(10, decimals) AS value,
    decimals,
    name,
    symbol,
    uri,
    {network:String} AS network
FROM filtered_balances AS b
LEFT JOIN metadata USING mint
ORDER BY timestamp DESC, owner, token_account, mint