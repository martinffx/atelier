export class AtelierError extends Error {
  constructor(
    message: string,
    public code: string,
    public exitCode = 1
  ) {
    super(message);
    this.name = 'AtelierError';
  }
}

export class ConfigNotFoundError extends AtelierError {
  constructor(command: string) {
    super(
      `.atelier/config.json not found. Run \`atelier ${command} --harness <claude|opencode|codex>\` first.`,
      'CONFIG_NOT_FOUND',
      1
    );
  }
}

export class HarnessRequiredError extends AtelierError {
  constructor() {
    super(
      '`--yes` requires `--harness` (claude, opencode, or codex).',
      'HARNESS_REQUIRED',
      1
    );
  }
}

export class InvalidHarnessError extends AtelierError {
  constructor(value: string) {
    super(
      `Invalid harness "${value}". Must be claude, opencode, or codex.`,
      'INVALID_HARNESS',
      1
    );
  }
}

export class SkillsInstallError extends AtelierError {
  constructor(cause: string) {
    super(
      `Failed to install skills: ${cause}. Run \`npx skills add martinffx/atelier\` manually.`,
      'SKILLS_INSTALL_FAILED',
      1
    );
  }
}

export class FileWriteError extends AtelierError {
  constructor(file: string, cause: string) {
    super(
      `Failed to write ${file}: ${cause}`,
      'FILE_WRITE_ERROR',
      1
    );
  }
}

export class HarnessConfigError extends AtelierError {
  constructor(file: string, cause: string) {
    super(
      `Failed to parse ${file}: ${cause}`,
      'HARNESS_CONFIG_ERROR',
      1
    );
  }
}

export class TemplateReadError extends AtelierError {
  constructor(template: string, cause: string) {
    super(
      `Failed to read template ${template}: ${cause}`,
      'TEMPLATE_READ_ERROR',
      1
    );
  }
}

export class InvalidConfigError extends AtelierError {
  constructor(cause: string, { suggestReinit = false }: { suggestReinit?: boolean } = {}) {
    const suffix = suggestReinit
      ? ' Run `atelier init --harness <claude|opencode|codex>` to reconfigure.'
      : '';
    super(
      `Invalid configuration: ${cause}.${suffix}`,
      'INVALID_CONFIG',
      1
    );
  }
}

export function handleError(error: unknown): never {
  if (error instanceof AtelierError) {
    console.error(`Error: ${error.message}`);
    process.exit(error.exitCode);
  }

  if (error instanceof Error) {
    console.error(`Error: ${error.message}`);
  } else {
    console.error('An unexpected error occurred.');
  }
  process.exit(1);
}
