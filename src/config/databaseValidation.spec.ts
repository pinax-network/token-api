import { describe, expect, it } from 'bun:test';
import { findMissingDatabases } from './databaseValidation.js';

describe('findMissingDatabases', () => {
    it('returns exact configured databases that are missing', () => {
        const available = ['solana:svm-balances@v0.3.0', 'solana:svm-dex@v0.3.0'];
        const expected = ['solana:svm-balances@v0.3.0', 'solana:svm-accounts@v0.3.0', 'solana:svm-dex@v0.3.0'];

        expect(findMissingDatabases(available, expected)).toEqual(['solana:svm-accounts@v0.3.0']);
    });

    it('does not treat same-network different-version databases as interchangeable', () => {
        const available = ['solana:svm-tokens@v0.2.8'];
        const expected = ['solana:svm-accounts@v0.3.0'];

        expect(findMissingDatabases(available, expected)).toEqual(['solana:svm-accounts@v0.3.0']);
    });
});
