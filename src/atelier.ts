#!/usr/bin/env bun
import { Command } from 'commander';
import { init } from './commands/init.js';
import { update } from './commands/update.js';
import { remove } from './commands/remove.js';
import { handleError } from './utils/errors.js';

const program = new Command();

program
  .name('atelier')
  .description('Atelier CLI - configure Claude Code and OpenCode for spec-driven development')
  .version('0.1.0');

program
  .command('init', { isDefault: true })
  .description('Initialize atelier in the current project')
  .option('--harness <type>', 'Harness type (claude or opencode)')
  .option('--all', 'Also install skills')
  .option('--yes', 'Non-interactive mode with defaults')
  .option('--project', 'Install skills in project directory instead of global')
  .action((options) => { init(options).catch(handleError); });

program
  .command('update')
  .description('Update atelier hooks and agents')
  .action(() => { update().catch(handleError); });

program
  .command('remove')
  .description('Remove atelier from the current project')
  .action(() => { try { remove(); } catch (e) { handleError(e); } });

program.parse();
