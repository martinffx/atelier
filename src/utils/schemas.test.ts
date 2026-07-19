import { describe, expect, it } from 'bun:test';
import { CursorConfigSchema } from './schemas.js';

describe('CursorConfigSchema', () => {
  it('accepts only configured Cursor agents', () => {
    const config = {
      agents: [
        { template: 'recon', name: 'recon', model: 'composer-2.5' },
        { template: 'oracle', name: 'oracle', model: 'claude-opus-4-8-high' },
        { template: 'architect', name: 'architect', model: 'gpt-5.6-sol-medium' },
      ],
    };

    expect(CursorConfigSchema.parse(config)).toEqual(config);
    expect(CursorConfigSchema.safeParse({ ...config, default_model: 'composer-2.5' }).success).toBe(false);
  });
});
