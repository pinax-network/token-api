/**
 * Common models used for protobuf and openapi3 outputs
 */
namespace Models {
    @pattern("^(0[xX])?[0-9a-fA-F]{40}$")
    scalar address extends string;

    // Use a generic to allow the model to represent a timestamp using different types for protobuf/openapi3
    model BlockInfo<TimestampType> {
        block_num: uint32;
        block_hash: string;
        timestamp: TimestampType;
    }

    model Trace {
        transaction_id: string;
        call_index: uint32;
    }

    model Log {
        log_index: uint32;
        log_block_index: uint32;
        log_ordinal: uint64;
    }

    model StorageChange {
        storage_key: string;
        storage_ordinal: uint64;
    }

    model Transfer {
        from: address;
        to: address;
        value: safeint;
    }

    model BalanceChange<TimestampType> {
        ...BlockInfo<TimestampType>;
        ...Trace;
        ...Log;
        ...StorageChange;
        ...Transfer;
        contract: address;
        owner: address;
        old_balance: safeint;
        new_balance: safeint;
        version: uint64;
    }
}
