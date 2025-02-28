import { defineConfig } from '@kubb/core';
import { pluginOas } from '@kubb/plugin-oas';
import { pluginZod } from '@kubb/swagger-zod';
export default defineConfig(() => {
    return {
        root: '.',
        input: {
            path: './static/@typespec/openapi3/openapi.json',
        },
        output: {
            path: './src/types'
        },
        plugins: [
            pluginOas({
                output: false,
                validate: false,
            }),
            pluginZod({
                output: {
                    path: './zod.gen.ts',
                },
                typedSchema: true,
                coercion: true,
            })
        ],
    };
});