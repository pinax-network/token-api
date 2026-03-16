import { describe, expect, it } from 'bun:test';
import { normalizeSQL } from '../../sql/index.js';
import evmQuery from './evm.sql' with { type: 'text' };
import tvmQuery from './tvm.sql' with { type: 'text' };

describe('swaps SQL regressions', () => {
    const evmSql = normalizeSQL(evmQuery);
    const tvmSql = normalizeSQL(tvmQuery);

    it('applies the same protocol comparison in prefilter and final row filter', () => {
        expect(evmSql).toContain(
            'WHERE (isNotNull({protocol:Nullable(String)}) AND protocol = {protocol:Nullable(String)})'
        );
        expect(evmSql).toContain('(isNull({protocol:Nullable(String)})');
        expect(evmSql).toContain('OR protocol = {protocol:Nullable(String)})');
        expect(evmSql).not.toContain("replaceAll({protocol:Nullable(String)}, '_', '-')");
        expect(tvmSql).toContain(
            'WHERE (isNotNull({protocol:Nullable(String)}) AND protocol = {protocol:Nullable(String)})'
        );
    });

    it('maps EVM caller and transaction_from filters to separate DB fields', () => {
        expect(evmSql).toContain('WHERE (notEmpty({caller:Array(String)}) AND call_caller IN {caller:Array(String)})');
        expect(evmSql).toContain(
            'WHERE (notEmpty({transaction_from:Array(String)}) AND tx_from IN {transaction_from:Array(String)})'
        );
        expect(evmSql).toContain(
            '(empty({caller:Array(String)})              OR call_caller IN {caller:Array(String)})'
        );
        expect(evmSql).toContain(
            '(empty({transaction_from:Array(String)})    OR tx_from IN {transaction_from:Array(String)})'
        );
    });

    it('selects the new swap ordering and log aliases while keeping TVM call-free', () => {
        expect(evmSql).toContain('s.tx_index AS transaction_index');
        expect(evmSql).toContain('s.tx_from AS transaction_from');
        expect(evmSql).toContain('s.call_index AS call_index');
        expect(evmSql).toContain('s.log_ordinal AS log_ordinal');
        expect(evmSql).toContain('s.log_block_index AS log_block_index');
        expect(evmSql).toContain('s.log_topic0 AS log_topic0');
        expect(evmSql).toContain('s.call_caller AS caller');

        expect(tvmSql).toContain('s.tx_index AS transaction_index');
        expect(tvmSql).toContain('s.tx_from AS transaction_from');
        expect(tvmSql).toContain('s.log_ordinal AS log_ordinal');
        expect(tvmSql).toContain('s.log_block_index AS log_block_index');
        expect(tvmSql).toContain('s.log_topic0 AS log_topic0');
        expect(tvmSql).toContain('s.tx_from AS caller');
        expect(tvmSql).not.toContain('call_caller');
        expect(tvmSql).not.toContain('call_index');
    });
});
