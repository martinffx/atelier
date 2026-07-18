#!/usr/bin/env bun
import { Command } from 'commander';
import { init } from './commands/init.js';
import { update } from './commands/update.js';
import { remove } from './commands/remove.js';
import { handleError } from './utils/errors.js';
import { HARNESS_NAMES } from './constants.js';
import './adapters/index.js';

const harnessChoices = HARNESS_NAMES.join(', ');

const program = new Command();

program
  .name('atelier')
  .description('Atelier CLI - configure Claude Code, OpenCode, and Codex for spec-driven development')
  .version('0.1.0');

program
  .command('init', { isDefault: true })
  .description('Initialize atelier globally')
  .option(`--harness <type>`, `Harness type (${harnessChoices})`)
  .option('--yes', 'Non-interactive mode with defaults')
  .action((options) => {
    init(options).catch(handleError);
  });

program
  .command('update')
  .description('Update atelier agents')
  .option(`--harness <type>`, `Harness type (${harnessChoices})`)
  .action((options) => { update(options).catch(handleError); });

program
  .command('remove')
  .description('Remove a configured harness from atelier')
  .option(`--harness <type>`, `Harness type (${harnessChoices})`)
  .action((options) => { remove(options).catch(handleError); });

program.parse();
