import { describe, expect, it } from 'bun:test';
import { ZodError } from 'zod';
import { computePagination } from './utils.js';

describe('computePagination', () => {
    it('returns correct pagination metadata for first page', () => {
        const result = computePagination(1, 10, 100);
        expect(result).toEqual({
            previous_page: 1,
            current_page: 1,
            next_page: 2,
            total_pages: 10,
        });
    });

    it('returns correct pagination metadata for last page', () => {
        const result = computePagination(10, 10, 100);
        expect(result).toEqual({
            previous_page: 9,
            current_page: 10,
            next_page: 10,
            total_pages: 10,
        });
    });

    it('returns correct pagination metadata for middle page', () => {
        const result = computePagination(5, 10, 100);
        expect(result).toEqual({
            previous_page: 4,
            current_page: 5,
            next_page: 6,
            total_pages: 10,
        });
    });

    it('returns correct pagination metadata when total rows is 0', () => {
        const result = computePagination(1, 10, 0);
        expect(result).toEqual({
            previous_page: 1,
            current_page: 1,
            next_page: 1,
            total_pages: 1,
        });
    });

    it('returns correct pagination metadata when total rows is not provided', () => {
        const result = computePagination(1, 10);
        expect(result).toEqual({
            previous_page: 1,
            current_page: 1,
            next_page: 1,
            total_pages: 1,
        });
    });

    it('throws an error when current page is less than 1', () => {
        expect(() => computePagination(0, 10, 100)).toThrowError(ZodError);
    });

    it('throws an error when rows per page is less than 1', () => {
        expect(() => computePagination(1, 0, 100)).toThrowError(ZodError);
    });
});
