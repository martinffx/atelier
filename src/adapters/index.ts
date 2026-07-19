import { registerAdapter } from '../registry.js';
import { claudeAdapter } from './claude.js';
import { opencodeAdapter } from './opencode.js';
import { codexAdapter } from './codex.js';
import { cursorAdapter } from './cursor.js';

registerAdapter(claudeAdapter);
registerAdapter(opencodeAdapter);
registerAdapter(codexAdapter);
registerAdapter(cursorAdapter);

export { claudeAdapter, opencodeAdapter, codexAdapter, cursorAdapter };
