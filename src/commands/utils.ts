import inquirer from 'inquirer';
import { getConfiguredHarnesses } from '../utils/config.js';
import { InvalidConfigError, InvalidHarnessError } from '../utils/errors.js';
import { HARNESS_NAMES } from '../constants.js';
import type { AtelierConfig, Harness } from '../types.js';

export async function resolveHarness(
  config: AtelierConfig,
  harnessOption: string | undefined,
  command: string,
): Promise<Harness> {
  if (harnessOption) {
    if (!HARNESS_NAMES.includes(harnessOption as Harness)) {
      throw new InvalidHarnessError(harnessOption);
    }
    const configured = getConfiguredHarnesses(config);
    if (!configured.includes(harnessOption as Harness)) {
      throw new InvalidConfigError(`Harness '${harnessOption}' is not configured. Run 'atelier init --harness ${harnessOption}' first.`);
    }
    return harnessOption as Harness;
  }

  const configured = getConfiguredHarnesses(config);
  if (configured.length === 0) {
    throw new InvalidConfigError('No harnesses configured');
  }

  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'harness',
      message: `Which harness do you want to ${command}?`,
      choices: configured,
    },
  ]);
  return answer.harness as Harness;
}
