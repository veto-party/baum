import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(
    defineConfig({
        test: {
            typecheck: {
                enabled: true
            }
        }
    })
);
