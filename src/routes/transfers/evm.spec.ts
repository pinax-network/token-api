import { describe, expect, it } from 'bun:test';
import { normalizeSQL } from '../../sql/index.js';
import evmQuery from './evm.sql' with { type: 'text' };
import tvmQuery from './tvm.sql' with { type: 'text' };

describe('transfers SQL regressions', () => {
    const evmSql = normalizeSQL(evmQuery);
    const tvmSql = normalizeSQL(tvmQuery);

    it('filters transfer contracts on the source log_address column', () => {
        expect(evmSql).toContain(
            'WHERE (notEmpty({contract:Array(String)}) AND log_address IN {contract:Array(String)})'
        );
        expect(evmSql).toContain('(empty({contract:Array(String)})');
        expect(evmSql).toContain('OR log_address IN {contract:Array(String)})');
        expect(tvmSql).toContain(
            'WHERE (notEmpty({contract:Array(String)}) AND log_address IN {contract:Array(String)})'
        );
    });

    it('maps new EVM caller and transaction_from filters to their DB columns', () => {
        expect(evmSql).toContain('WHERE (notEmpty({caller:Array(String)}) AND call_caller IN {caller:Array(String)})');
        expect(evmSql).toContain(
            'WHERE (notEmpty({transaction_from:Array(String)}) AND trx_from IN {transaction_from:Array(String)})'
        );
        expect(evmSql).toContain('(empty({caller:Array(String)}) OR call_caller IN {caller:Array(String)})');
        expect(evmSql).toContain(
            '(empty({transaction_from:Array(String)}) OR trx_from IN {transaction_from:Array(String)})'
        );
    });

    it('selects the new ordering and log aliases for EVM and TVM transfers', () => {
        expect(evmSql).toContain('t.tx_index as transaction_index');
        expect(evmSql).toContain('t.trx_from as transaction_from');
        expect(evmSql).toContain('t.call_caller as caller');
        expect(evmSql).toContain('t.call_index as call_index');
        expect(evmSql).toContain('t.log_ordinal as log_ordinal');
        expect(evmSql).toContain('t.log_block_index as log_block_index');
        expect(evmSql).toContain('t.log_topic0 as log_topic0');

        expect(tvmSql).toContain('t.tx_index as transaction_index');
        expect(tvmSql).toContain('t.trx_from as transaction_from');
        expect(tvmSql).toContain('t.log_ordinal as log_ordinal');
        expect(tvmSql).toContain('t.log_block_index as log_block_index');
        expect(tvmSql).toContain('t.log_topic0 as log_topic0');
        expect(tvmSql).not.toContain('call_caller');
        expect(tvmSql).not.toContain('call_index');
    });
});
