import { describe, expect, it } from 'bun:test';
import { parsePlans } from './config.js';

describe('parsePlans', () => {
    it('should return null for empty string', () => {
        expect(parsePlans('')).toBeNull();
    });

    it('should return null for whitespace-only string', () => {
        expect(parsePlans('   ')).toBeNull();
    });

    it('should parse a single plan', () => {
        const result = parsePlans('starter:100,5,1m|5m|15m');
        expect(result).toBeInstanceOf(Map);
        expect(result!.size).toBe(2); // original + tgm- prefixed
        expect(result!.get('starter')).toEqual({
            maxLimit: 100,
            maxBatched: 5,
            allowedIntervals: ['1m', '5m', '15m'],
        });
        expect(result!.get('tgm-STARTER')).toEqual({
            maxLimit: 100,
            maxBatched: 5,
            allowedIntervals: ['1m', '5m', '15m'],
        });
    });

    it('should parse multiple plans separated by semicolons', () => {
        const result = parsePlans('free:10,1,1m;pro:1000,50,1m|5m|15m|1h');
        expect(result).toBeInstanceOf(Map);
        expect(result!.size).toBe(4); // 2 plans + 2 tgm- prefixed
        expect(result!.get('free')).toEqual({
            maxLimit: 10,
            maxBatched: 1,
            allowedIntervals: ['1m'],
        });
        expect(result!.get('pro')).toEqual({
            maxLimit: 1000,
            maxBatched: 50,
            allowedIntervals: ['1m', '5m', '15m', '1h'],
        });
    });

    it('should handle plan with empty intervals', () => {
        const result = parsePlans('basic:50,3,');
        expect(result).toBeInstanceOf(Map);
        expect(result!.get('basic')).toEqual({
            maxLimit: 50,
            maxBatched: 3,
            allowedIntervals: [],
        });
    });

    it('should not duplicate tgm- prefixed plans', () => {
        const result = parsePlans('tgm-PRO:500,10,1m|5m');
        expect(result).toBeInstanceOf(Map);
        expect(result!.size).toBe(1); // only the original, no extra tgm- prefix
        expect(result!.get('tgm-PRO')).toEqual({
            maxLimit: 500,
            maxBatched: 10,
            allowedIntervals: ['1m', '5m'],
        });
    });

    it('should throw on malformed plan entry (no colon separator)', () => {
        expect(() => parsePlans('invalid-plan')).toThrow('Malformed plan entry');
    });

    it('should throw on invalid limits format (wrong number of comma-separated values)', () => {
        expect(() => parsePlans('bad:100,5')).toThrow('Invalid limits format');
    });

    it('should throw on non-numeric limit', () => {
        expect(() => parsePlans('bad:abc,5,1m')).toThrow('Invalid numeric limits');
    });

    it('should throw on non-numeric batched', () => {
        expect(() => parsePlans('bad:100,xyz,1m')).toThrow('Invalid numeric limits');
    });
});
