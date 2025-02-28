import * as balances from "./account/balances/[address]/index.js";
import * as transfers from "./account/transfers/[address]/index.js";

// -- /account --
const account = {
    balances: balances.default,
    transfers: transfers.default
}

export { account };
