import "@typespec/http";
import "@typespec/openapi";
import "./models.tsp";

using TypeSpec.Http;
using TypeSpec.OpenAPI;

@service({
    title: "ERC-20 Token API",
})
@info({
    `x-description`: "ERC-20 tokens balances and transfers",
    version: "2.0.0",
}) // From @typespec/openapi
//@server("https://eos.api.pinax.network/v1", "EOS V1 Api Endpoint")
namespace AntelopeTokenApi;

alias ApiKeyHeader = "X-Api-Key";
// Error codes adapted from https://github.com/pinax-network/golang-base/blob/develop/response/errors.go
alias ApiErrorCode =
    | "bad_database_response" // invalid response from the database
    | "bad_header" // invalid or malformed header given
    | "missing_required_header" // request is missing a header
    | "bad_query_input" // given query input is missing or malformed
    | "database_timeout" // timeout while connecting to database
    | "forbidden" // not allowed to access this endpoint
    | "internal_server_error" // an unknown error occurred on the backend
    | "method_not_allowed" // http method is not allowed on this endpoint
    | "route_not_found" // the requested route was not found
    | "unauthorized" // invalid authorization information given
    | "not_found_data"; // no data found for the given query

alias ErrorStatusCode = 500 | 504 | 400 | 401 | 403 | 404 | 405;

@error
model ApiError {
    status: ErrorStatusCode;
    code: ApiErrorCode;
    message: string;
}

alias TimestampType = string;
// Helper aliases for accessing underlying properties
alias BlockInfo = Models.BlockInfo<TimestampType>;

// Models will be present in the OpenAPI components
//model Transfer is Models.Transfer<TimestampType>;
model BalanceChange is Models.BalanceChange<TimestampType>;
//model Supply is Models.Supply<TimestampType>;
//model Holder {
//    account: BalanceChange.account;
//    balance: BalanceChange.value;
//}
model Balance {
    last_updated_block: BalanceChange.block_num;
    contract: BalanceChange.contract;
    balance: BalanceChange.new_balance;
}

model QueryStatistics {
    elapsed: float;
    rows_read: safeint;
    bytes_read: safeint;
}

model Pagination {
    next_page: safeint;
    previous_page: safeint;
    total_pages: safeint;
    total_results: safeint;
}

model ResponseMetadata {
    statistics: QueryStatistics | null;
    ...Pagination;
}

model UsageResponse<T> {
    data: T;
    meta: ResponseMetadata;
}

@maxItems(2)
model BlockRange is BlockInfo.block_num[];

// Alias will *not* be present in the OpenAPI components.
// This also helps preventing self-references in generated `components` for codegen to work properly.
alias ApiResponse<T> = T | ApiError;
alias PaginationQueryParams = {
    @query limit?: uint64 = 10;
    @query page?: uint64 = 1;
};

interface Usage {
    /**
        Token balances of an account.
        @returns Array of balances.
    */
    @tag("Account")
    @summary("Account token balances")
    @route("/account/balances")
    @get
    @useAuth(ApiKeyAuth<ApiKeyLocation.header, ApiKeyHeader>)
    balance(
        @query account: BalanceChange.owner,
        @query contract?: BalanceChange.contract,
        ...PaginationQueryParams,
    ): ApiResponse<UsageResponse<Balance[]>>;

    /**
        Historical token balances of an account.
        @returns Array of balances.
    @tag("Account")
    @summary("Account historical token balances")
    @route("/account/balances/historical")
    @get
    @useAuth(ApiKeyAuth<ApiKeyLocation.header, ApiKeyHeader>)
    balanceHistorical(
        @query account: BalanceChange.owner,
        @query block_num: BlockInfo.block_num,
        @query contract?: BalanceChange.contract,
        ...PaginationQueryParams,
    ): ApiResponse<UsageResponse<BalanceChange[]>>;
    */

    /**
        All transfers related to an account.
        @returns Array of transfers.
    
    @tag("Account")
    @summary("Account token transfers")
    @route("/account/transfers")
    @get
    @useAuth(ApiKeyAuth<ApiKeyLocation.header, ApiKeyHeader>)
    transfersAccount(
        @query account: BalanceChange.account,
        @query(#{ explode: false }) block_range?: BlockRange,
        @query from?: Transfer.from,
        @query to?: Transfer.to,
        @query contract?: TokenIdentifier.contract,
        @query symcode?: TokenIdentifier.symcode,
        ...PaginationQueryParams,
    ): ApiResponse<UsageResponse<Transfer[]>>;
    */

    /**
        List of holders of a token.
        @returns Array of accounts.
    
    @tag("Tokens")
    @summary("Token holders")
    @route("/tokens/holders")
    @get
    @useAuth(ApiKeyAuth<ApiKeyLocation.header, ApiKeyHeader>)
    holders(
        @query contract: TokenIdentifier.contract,
        @query symcode: TokenIdentifier.symcode,
        ...PaginationQueryParams,
    ): ApiResponse<UsageResponse<Holder[]>>;
    */

    /**
        Total supply for a token.
        @returns Array of supplies.
    @tag("Tokens")
    @summary("Token supply")
    @route("/tokens/supplies")
    @get
    @useAuth(ApiKeyAuth<ApiKeyLocation.header, ApiKeyHeader>)
    supply(
        @query block_num?: BlockInfo.block_num,
        @query issuer?: Supply.issuer,
        @query contract: TokenIdentifier.contract,
        @query symcode: TokenIdentifier.symcode,
        ...PaginationQueryParams,
    ): ApiResponse<UsageResponse<Supply[]>>;
    */

    /**
        List of available tokens.
        @returns Array of token identifier.
    
    @tag("Tokens")
    @summary("Tokens")
    @route("/tokens")
    @get
    @useAuth(ApiKeyAuth<ApiKeyLocation.header, ApiKeyHeader>)
    tokens(
        ...PaginationQueryParams,
    ): ApiResponse<UsageResponse<TokenIdentifier[]>>;
    */

    /**
        All transfers related to a token.
        @returns Array of transfers.
    
    @tag("Transfers")
    @summary("Token transfers")
    @route("/transfers")
    @get
    @useAuth(ApiKeyAuth<ApiKeyLocation.header, ApiKeyHeader>)
    transfers(
        @query(#{ explode: false }) block_range?: BlockRange,
        @query contract: TokenIdentifier.contract,
        @query symcode: TokenIdentifier.symcode,
        ...PaginationQueryParams,
    ): ApiResponse<UsageResponse<Transfer[]>>;
    */

    /**
        Specific transfer related to a token.
        @returns Array of transfers.
    
    @tag("Transfers")
    @summary("Token transfer")
    @route("/transfers/id")
    @get
    @useAuth(ApiKeyAuth<ApiKeyLocation.header, ApiKeyHeader>)
    transferId(
        @query trx_id: Models.TraceInformation.trx_id,
        ...PaginationQueryParams,
    ): ApiResponse<UsageResponse<Transfer[]>>;
    */
}

model Version {
    @pattern("^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$") // Adapted from https://semver.org/
    version: string;

    @pattern("^[0-9a-f]{7}$")
    commit: string;
}

@tag("Docs")
interface Docs {
    /**
        Reflection endpoint to return OpenAPI JSON spec. Also used by Swagger to generate the frontpage.
        @returns The OpenAPI JSON spec
    */
    @summary("OpenAPI JSON spec")
    @route("/openapi")
    @get
    openapi(): ApiResponse<{}>;

    /**
        Api version and Git short commit hash.
        @returns The Api version and commit hash.
    */
    @summary("Api version")
    @route("/version")
    @get
    version(): ApiResponse<Version>;
}

@tag("Monitoring")
interface Monitoring {
    /**
        Checks database connection.
        @returns OK or ApiError.
    */
    @summary("Health check")
    @route("/health")
    @get
    health(): ApiResponse<string>;

    /**
        Prometheus metrics.
        @returns Metrics as text.
    */
    @summary("Prometheus metrics")
    @route("/metrics")
    @get
    metrics(): ApiResponse<string>;

    /**
        Current head block for which data is available (can be lower than head block of the chain).
        @returns Head block information.
    */
    @summary("Head block information")
    @route("/head")
    @get
    head(): ApiResponse<{
        block_num: BlockInfo.block_num;
        block_hash: string;
    }>;
}
