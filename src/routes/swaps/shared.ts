export const swapAddressFieldDescriptions = {
    transaction_from: 'Onchain transaction initiator address.',
    caller: 'Account or contract that calls the swap-relevant contract.',
    user: 'Normalized user-oriented swap address. Prefer this field for integrations; sender and recipient remain legacy compatibility fields and are planned for deprecation in a future major release.',
    sender: 'Legacy compatibility field for swap sender semantics. Prefer user for a normalized user-oriented swap address.',
    recipient:
        'Legacy compatibility field for swap recipient semantics. Prefer user for a normalized user-oriented swap address.',
} as const;
