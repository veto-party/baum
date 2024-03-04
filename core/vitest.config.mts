import { defineConfig, mergeConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        typecheck: {
            enabled: true
        }
    }
});
