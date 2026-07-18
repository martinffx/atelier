import type { Harness, HarnessAdapter } from './types.js';
import { InvalidHarnessError } from './utils/errors.js';

const adapters = new Map<Harness, HarnessAdapter>();

export function registerAdapter(adapter: HarnessAdapter): void {
  adapters.set(adapter.name, adapter);
}

export function getAdapter(harness: Harness): HarnessAdapter {
  const adapter = adapters.get(harness);
  if (!adapter) {
    throw new InvalidHarnessError(harness);
  }
  return adapter;
}

export function listAdapters(): HarnessAdapter[] {
  return [...adapters.values()];
}

export function listHarnessNames(): Harness[] {
  return [...adapters.keys()];
}
