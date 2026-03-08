import { describe, expect, it } from 'bun:test';

import dexesQuery from './dexes/svm.sql' with { type: 'text' };
import ohlcvQuery from './ohlcv/svm.sql' with { type: 'text' };
import poolsQuery from './pools/svm.sql' with { type: 'text' };
import swapsQuery from './swaps/svm.sql' with { type: 'text' };

describe('SVM DEX SQL string projections', () => {
    it('stringifies address-like fields in the swaps query', () => {
        expect(swapsQuery).toContain('toString(signature) AS signature');
        expect(swapsQuery).toContain('toString(program_id) AS program_id');
        expect(swapsQuery).toContain('toString(program_names(program_id)) AS program_name');
        expect(swapsQuery).toContain('toString(amm) AS amm');
        expect(swapsQuery).toContain('toString(amm_pool) AS amm_pool');
        expect(swapsQuery).toContain('toString(user) AS user');
        expect(swapsQuery).toContain('toString(input_mint) AS input_mint');
        expect(swapsQuery).toContain('toString(output_mint) AS output_mint');
    });

    it('keeps other SVM DEX queries stringifying identifier fields', () => {
        expect(dexesQuery).toContain('toString(program_id) AS program_id');
        expect(dexesQuery).toContain('toString(amm) AS amm');

        expect(poolsQuery).toContain('toString(program_id) AS program_id');
        expect(poolsQuery).toContain('toString(amm) AS amm');
        expect(poolsQuery).toContain('toString(amm_pool) AS amm_pool');
        expect(poolsQuery).toContain('toString(mint1) AS input_mint');
        expect(poolsQuery).toContain('toString(mint0) AS output_mint');

        expect(ohlcvQuery).toContain('toString(o.amm) AS amm');
        expect(ohlcvQuery).toContain('toString(o.amm_pool) AS amm_pool');
        expect(ohlcvQuery).toContain('toString(o.mint0) AS token0');
        expect(ohlcvQuery).toContain('toString(o.mint1) AS token1');
    });
});
