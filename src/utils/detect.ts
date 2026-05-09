import { existsSync } from 'fs';
import type { Harness } from '../types.js';

export function detectHarness(override?: string): Harness | null {
  if (override === 'claude' || override === 'opencode') {
    return override;
  }

  if (process.env.CLAUDE_PLUGIN_ROOT) {
    return 'claude';
  }

  if (existsSync('.opencode') || existsSync('opencode.json')) {
    return 'opencode';
  }

  return null;
}
