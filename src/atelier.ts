#!/usr/bin/env bun
import { Command } from 'commander';
import { init } from './commands/init.js';
import { update } from './commands/update.js';
import { remove } from './commands/remove.js';
import { handleError, HarnessRequiredError } from './utils/errors.js';

const program = new Command();

program
  .name('atelier')
  .description('Atelier CLI - configure Claude Code, OpenCode, and Codex for spec-driven development')
  .version('0.1.0');

program
  .command('init', { isDefault: true })
  .description('Initialize atelier in the current project')
  .option('--harness <type>', 'Harness type (claude, opencode, or codex)')
  .option('--all', 'Also install skills')
  .option('--yes', 'Non-interactive mode with defaults')
  .option('--project', 'Install skills in project directory instead of global')
  .action((options) => {
    if (options.yes && !options.harness) {
      handleError(new HarnessRequiredError());
      return;
    }
    init(options).catch(handleError);
  });

program
  .command('update')
  .description('Update atelier hooks and agents')
  .option('--harness <type>', 'Harness type (claude, opencode, or codex)')
  .action((options) => { update(options).catch(handleError); });

program
  .command('remove')
  .description('Remove atelier from the current project')
  .option('--harness <type>', 'Harness type (claude, opencode, or codex)')
  .action((options) => { remove(options).catch(handleError); });

program.parse();
