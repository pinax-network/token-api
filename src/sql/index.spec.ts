import { describe, expect, test } from 'bun:test';
import { normalizeSQL } from './index.js';

describe('normalizeSQL', () => {
    test('should fold multiline SQL into single line', () => {
        const input = 'SELECT *\nFROM table\nWHERE id = 1';
        expect(normalizeSQL(input)).toBe('SELECT * FROM table WHERE id = 1');
    });

    test('should remove semicolons', () => {
        const input = 'SELECT * FROM table;';
        expect(normalizeSQL(input)).toBe('SELECT * FROM table');
    });

    test('should handle semicolons in comments', () => {
        const input = '/* comment; */\nSELECT * FROM table';
        expect(normalizeSQL(input)).toBe('/* comment  */ SELECT * FROM table');
    });

    test('should trim whitespace', () => {
        const input = '  SELECT * FROM table  ';
        expect(normalizeSQL(input)).toBe('SELECT * FROM table');
    });

    test('should handle already single-line SQL', () => {
        const input = 'SELECT * FROM table WHERE id = 1';
        expect(normalizeSQL(input)).toBe('SELECT * FROM table WHERE id = 1');
    });

    test('should handle empty string', () => {
        expect(normalizeSQL('')).toBe('');
    });
});
