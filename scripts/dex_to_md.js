const response = await (await fetch('http://localhost:8000/dexes/svm?limit=1000')).json();

// # Programs and Aggregators

// ## Non-Aggregators (`is_aggregator = false`)

// | Program ID | Program Name |
// |------------|--------------|
// | P001       | Program Alpha |
// | P002       | Program Beta  |
// | P003       | Program Gamma |
// | ...        | ...           |

// ## Aggregators (`is_aggregator = true`)

// | AMM | AMM Name     |
// |-----|--------------|
// | A001| Aggregator One |
// | A002| Aggregator Two |
// | A003| Aggregator Three |
// | ... | ...            |

// Non-Aggregators
console.log('| Program Name | Program ID |');
console.log('|------------|--------------|');
const amms = new Set();
for (const dex of response.data) {
    if (!dex.is_aggregator) {
        console.log(`| ${dex.program_name} | ${dex.program_id} |`);
        amms.add(dex.program_id);
    }
}

// Aggregators
console.log('\n| AMM Name | AMM ID |');
console.log('|-----|--------------|');
for (const dex of response.data) {
    if (dex.is_aggregator) {
        if (amms.has(dex.amm)) continue; // Skip duplicates
        if (dex.amm_name === 'Unknown') continue; // Skip unknown AMMs
        console.log(`| ${dex.amm_name} | ${dex.amm} |`);
        amms.add(dex.amm);
    }
}