#!/usr/bin/env bun
import { Command } from 'commander';
import type { Harness } from './types.js';

const program = new Command();

program
  .name('atelier')
  .description('Atelier CLI - configure Claude Code and OpenCode for spec-driven development')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize atelier in the current project')
  .option('--harness <type>', 'Harness type (claude or opencode)')
  .option('--all', 'Also install skills')
  .option('--yes', 'Non-interactive mode with defaults')
  .option('--global', 'Install skills globally')
  .action((options) => {
    console.log('init command - not yet implemented');
    console.log('Options:', options);
  });

program
  .command('update')
  .description('Update atelier hooks and agents')
  .action(() => {
    console.log('update command - not yet implemented');
  });

program
  .command('remove')
  .description('Remove atelier from the current project')
  .action(() => {
    console.log('remove command - not yet implemented');
  });

program.parse();
