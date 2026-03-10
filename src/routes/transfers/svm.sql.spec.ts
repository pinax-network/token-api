import { describe, expect, it } from 'bun:test';
import { normalizeSQL } from '../../sql/index.js';
import query from './svm.sql' with { type: 'text' };

describe('SVM transfers SQL regressions', () => {
    const sql = normalizeSQL(query);

    it('clamped_start_ts respects start_block when no other filters are active', () => {
        expect(sql).toContain('isNotNull({start_time:Nullable(UInt64)}) OR isNotNull({start_block:Nullable(UInt32)})');
    });
});
