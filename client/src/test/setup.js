// Vitest global setup. Runs once before each test file.
// Loaded via `setupFiles` in vite.config.js.

import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Auto-unmount React trees and clear the DOM between tests so a leaked
// component from one test never poisons the next.
afterEach(() => {
    cleanup();
});
