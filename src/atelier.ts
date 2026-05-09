#!/usr/bin/env bun
import { Command } from 'commander';
import { init } from './commands/init.js';
import { update } from './commands/update.js';
import { remove } from './commands/remove.js';

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
  .action(init);

program
  .command('update')
  .description('Update atelier hooks and agents')
  .action(update);

program
  .command('remove')
  .description('Remove atelier from the current project')
  .action(remove);

program.parse();
