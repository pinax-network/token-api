import type { ApiErrorResponse, ApiUsageResponse } from '../../types/zod.js';

type EvmSwapToken = {
    address: string | null;
    symbol: string | null;
    decimals: number | null;
};

type EvmSwapRow = {
    input_token: EvmSwapToken;
    output_token: EvmSwapToken;
    input_amount: string;
    output_amount: string;
    input_value: number;
    output_value: number;
    price: number;
    price_inv: number;
    protocol: string;
    summary: string;
};

const READABLE_QUANTITY_SUFFIXES = [
    { value: 1_000_000_000_000, suffix: 'trillion' },
    { value: 1_000_000_000, suffix: 'billion' },
    { value: 1_000_000, suffix: 'million' },
    { value: 1_000, suffix: 'thousand' },
] as const;

function toPlainNumberString(value: number) {
    const stringValue = value.toString();

    if (!stringValue.includes('e')) {
        return stringValue;
    }

    const [mantissa = '', exponentPart = '0'] = stringValue.toLowerCase().split('e');
    const exponent = Number(exponentPart);
    const sign = mantissa.startsWith('-') ? '-' : '';
    const unsignedMantissa = sign ? mantissa.slice(1) : mantissa;
    const [integerPart = '', fractionalPart = ''] = unsignedMantissa.split('.');
    const digits = `${integerPart}${fractionalPart}`;
    const decimalIndex = integerPart.length + exponent;

    if (decimalIndex <= 0) {
        return `${sign}0.${'0'.repeat(Math.abs(decimalIndex))}${digits}`;
    }

    if (decimalIndex >= digits.length) {
        return `${sign}${digits}${'0'.repeat(decimalIndex - digits.length)}`;
    }

    return `${sign}${digits.slice(0, decimalIndex)}.${digits.slice(decimalIndex)}`;
}

function formatReadableQuantity(value: number) {
    for (const readableQuantity of READABLE_QUANTITY_SUFFIXES) {
        if (Math.abs(value) >= readableQuantity.value) {
            return `${(value / readableQuantity.value).toFixed(2)} ${readableQuantity.suffix}`;
        }
    }

    return toPlainNumberString(value);
}

function formatProtocol(protocol: string) {
    return protocol
        .split('_')
        .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
        .join(' ');
}

function buildSwapSummary(row: EvmSwapRow) {
    return `Swap ${formatReadableQuantity(row.input_value)} ${row.input_token.symbol ?? ''} for ${formatReadableQuantity(row.output_value)} ${row.output_token.symbol ?? ''} on ${formatProtocol(row.protocol)}`;
}

function shouldApplyTemporaryUniswapV3Hotfix(row: EvmSwapRow) {
    return row.protocol === 'uniswap_v3';
}

function normalizeTemporaryUniswapV3SwapRow<T extends EvmSwapRow>(row: T): T {
    if (!shouldApplyTemporaryUniswapV3Hotfix(row)) {
        return row;
    }

    const normalizedRow = {
        ...row,
        input_token: row.output_token,
        output_token: row.input_token,
        input_amount: row.output_amount,
        output_amount: row.input_amount,
        input_value: row.output_value,
        output_value: row.input_value,
        price: row.price_inv,
        price_inv: row.price,
    };

    return {
        ...normalizedRow,
        // TODO(pinax-network/substreams-evm#237): remove this API hotfix after upstream Uniswap V3 swap sides are fixed in the database.
        summary: buildSwapSummary(normalizedRow),
    };
}

export function applyTemporaryEvmUniswapV3SwapHotfix(
    response: ApiUsageResponse | ApiErrorResponse
): ApiUsageResponse | ApiErrorResponse {
    if ('status' in response) {
        return response;
    }

    return {
        ...response,
        data: response.data.map((row) => normalizeTemporaryUniswapV3SwapRow(row as EvmSwapRow)),
    };
}
