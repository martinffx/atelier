import { registerAdapter } from '../registry.js';
import { claudeAdapter } from './claude.js';
import { opencodeAdapter } from './opencode.js';
import { codexAdapter } from './codex.js';

registerAdapter(claudeAdapter);
registerAdapter(opencodeAdapter);
registerAdapter(codexAdapter);

export { claudeAdapter, opencodeAdapter, codexAdapter };
