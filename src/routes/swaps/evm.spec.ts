import { describe, expect, it } from 'bun:test';
import { normalizeSQL } from '../../sql/index.js';
import query from './evm.sql' with { type: 'text' };

describe('EVM/TVM swaps SQL regressions', () => {
    const sql = normalizeSQL(query);

    it('applies the same protocol comparison in prefilter and final row filter', () => {
        expect(sql).toContain(
            'WHERE (isNotNull({protocol:Nullable(String)}) AND protocol = {protocol:Nullable(String)})'
        );
        expect(sql).toContain('(isNull({protocol:Nullable(String)})');
        expect(sql).toContain('OR protocol = {protocol:Nullable(String)})');
        expect(sql).not.toContain("replaceAll({protocol:Nullable(String)}, '_', '-')");
    });
});
