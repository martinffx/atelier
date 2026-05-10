import { describe, test, expect, mock, beforeEach, afterEach } from 'bun:test';

let mockGenerateClaude: ReturnType<typeof mock>;
let mockGenerateOpenCode: ReturnType<typeof mock>;
let mockReadConfig: ReturnType<typeof mock>;
let mockWriteConfig: ReturnType<typeof mock>;
let mockGetDefaultConfig: ReturnType<typeof mock>;
let mockDetectHarness: ReturnType<typeof mock>;
let mockGetModelsForProvider: ReturnType<typeof mock>;
let mockGetModelsForHarness: ReturnType<typeof mock>;

beforeEach(() => {
  mockGenerateClaude = mock();
  mockGenerateOpenCode = mock();
  mockReadConfig = mock();
  mockWriteConfig = mock();
  mockGetDefaultConfig = mock();
  mockDetectHarness = mock();
  mockGetModelsForProvider = mock();
  mockGetModelsForHarness = mock();
});

afterEach(() => {
  mock.restore();
});

describe('init', () => {
  test('calls generateClaude with correct config for claude harness', async () => {
    const defaultConfig = {
      version: '1.0.0' as const,
      harness: 'claude' as const,
      skills_source: 'martinffx/atelier',
      skills_path: '~/.agents/skills/atelier',
      agents: [
        { template: 'scout', name: 'scout', model: 'haiku' },
        { template: 'oracle', name: 'oracle', model: 'opus' },
        { template: 'architect', name: 'architect', model: 'opus' },
      ],
    };

    mockReadConfig.mockReturnValue(null);
    mockGetDefaultConfig.mockReturnValue({ ...defaultConfig });
    mockDetectHarness.mockReturnValue('claude');
    mockGetModelsForProvider.mockReturnValue(['haiku', 'sonnet', 'opus']);

    mock.module('../utils/detect.js', () => ({
      detectHarness: mockDetectHarness,
    }));

    mock.module('../utils/config.js', () => ({
      readConfig: mockReadConfig,
      writeConfig: mockWriteConfig,
      getDefaultConfig: mockGetDefaultConfig,
    }));

    mock.module('../generators/claude.js', () => ({
      generateClaude: mockGenerateClaude,
    }));

    mock.module('../generators/opencode.js', () => ({
      generateOpenCode: mockGenerateOpenCode,
    }));

    mock.module('../utils/templates.js', () => ({
      getModelsForProvider: mockGetModelsForProvider,
      getModelsForHarness: mockGetModelsForHarness,
    }));

    mock.module('inquirer', () => ({
      default: { prompt: async () => ({ harness: 'claude', confirm: true }) },
    }));

    const { init } = await import('./init.js');
    await init({ yes: true, harness: 'claude' });

    expect(mockWriteConfig).toHaveBeenCalled();
    expect(mockGenerateClaude).toHaveBeenCalled();
    expect(mockGenerateOpenCode).not.toHaveBeenCalled();
  });

  test('calls generateOpenCode with correct config for opencode harness', async () => {
    const defaultConfig = {
      version: '1.0.0' as const,
      harness: 'opencode' as const,
      provider: 'opencode-zen' as const,
      skills_source: 'martinffx/atelier',
      skills_path: '~/.agents/skills/atelier',
      agents: [
        { template: 'scout', name: 'scout', model: 'opencode/deepseek-v4-flash' },
        { template: 'oracle', name: 'oracle', model: 'opencode/kimi-k2.6' },
        { template: 'architect', name: 'architect', model: 'opencode/deepseek-v4-pro' },
      ],
    };

    mockReadConfig.mockReturnValue(null);
    mockGetDefaultConfig.mockReturnValue({ ...defaultConfig });
    mockDetectHarness.mockReturnValue('opencode');
    mockGetModelsForProvider.mockReturnValue([
      'opencode/deepseek-v4-flash',
      'opencode/kimi-k2.6',
      'opencode/deepseek-v4-pro',
    ]);

    mock.module('../utils/detect.js', () => ({
      detectHarness: mockDetectHarness,
    }));

    mock.module('../utils/config.js', () => ({
      readConfig: mockReadConfig,
      writeConfig: mockWriteConfig,
      getDefaultConfig: mockGetDefaultConfig,
    }));

    mock.module('../generators/claude.js', () => ({
      generateClaude: mockGenerateClaude,
    }));

    mock.module('../generators/opencode.js', () => ({
      generateOpenCode: mockGenerateOpenCode,
    }));

    mock.module('../utils/templates.js', () => ({
      getModelsForProvider: mockGetModelsForProvider,
      getModelsForHarness: mockGetModelsForHarness,
    }));

    mock.module('inquirer', () => ({
      default: {
        prompt: async () => ({
          harness: 'opencode',
          confirm: true,
          provider: 'opencode-zen',
          scout: 'opencode/deepseek-v4-flash',
          oracle: 'opencode/kimi-k2.6',
          architect: 'opencode/deepseek-v4-pro',
        }),
      },
    }));

    const { init } = await import('./init.js');
    await init({ yes: true, harness: 'opencode' });

    expect(mockWriteConfig).toHaveBeenCalled();
    expect(mockGenerateOpenCode).toHaveBeenCalled();
    expect(mockGenerateClaude).not.toHaveBeenCalled();
  });

  test('defaults to opencode-zen provider in --yes mode for opencode harness', async () => {
    const defaultConfig = {
      version: '1.0.0' as const,
      harness: 'opencode' as const,
      provider: 'opencode-zen' as const,
      skills_source: 'martinffx/atelier',
      skills_path: '~/.agents/skills/atelier',
      agents: [
        { template: 'scout', name: 'scout', model: 'opencode/deepseek-v4-flash' },
        { template: 'oracle', name: 'oracle', model: 'opencode/kimi-k2.6' },
        { template: 'architect', name: 'architect', model: 'opencode/deepseek-v4-pro' },
      ],
    };

    mockReadConfig.mockReturnValue(null);
    mockGetDefaultConfig.mockReturnValue({ ...defaultConfig });
    mockDetectHarness.mockReturnValue('opencode');
    mockGetModelsForProvider.mockReturnValue([
      'opencode/deepseek-v4-flash',
      'opencode/kimi-k2.6',
    ]);

    mock.module('../utils/detect.js', () => ({
      detectHarness: mockDetectHarness,
    }));

    mock.module('../utils/config.js', () => ({
      readConfig: mockReadConfig,
      writeConfig: mockWriteConfig,
      getDefaultConfig: mockGetDefaultConfig,
    }));

    mock.module('../generators/claude.js', () => ({
      generateClaude: mockGenerateClaude,
    }));

    mock.module('../generators/opencode.js', () => ({
      generateOpenCode: mockGenerateOpenCode,
    }));

    mock.module('../utils/templates.js', () => ({
      getModelsForProvider: mockGetModelsForProvider,
      getModelsForHarness: mockGetModelsForHarness,
    }));

    mock.module('inquirer', () => ({
      default: { prompt: async () => ({}) },
    }));

    const { init } = await import('./init.js');
    await init({ yes: true, harness: 'opencode' });

    expect(mockGetDefaultConfig).toHaveBeenCalledWith('opencode', 'opencode-zen');
    expect(mockGenerateOpenCode).toHaveBeenCalled();
  });

  test('prompts for provider when opencode harness and no provider set', async () => {
    const defaultConfig = {
      version: '1.0.0' as const,
      harness: 'opencode' as const,
      skills_source: 'martinffx/atelier',
      skills_path: '~/.agents/skills/atelier',
      agents: [
        { template: 'scout', name: 'scout', model: 'opencode/deepseek-v4-flash' },
        { template: 'oracle', name: 'oracle', model: 'opencode/kimi-k2.6' },
        { template: 'architect', name: 'architect', model: 'opencode/deepseek-v4-pro' },
      ],
    };

    mockReadConfig.mockReturnValue(null);
    mockGetDefaultConfig.mockReturnValue({ ...defaultConfig });
    mockDetectHarness.mockReturnValue('opencode');
    mockGetModelsForProvider.mockReturnValue([
      'opencode/deepseek-v4-flash',
      'opencode/kimi-k2.6',
    ]);

    mock.module('../utils/detect.js', () => ({
      detectHarness: mockDetectHarness,
    }));

    mock.module('../utils/config.js', () => ({
      readConfig: mockReadConfig,
      writeConfig: mockWriteConfig,
      getDefaultConfig: mockGetDefaultConfig,
    }));

    mock.module('../generators/claude.js', () => ({
      generateClaude: mockGenerateClaude,
    }));

    mock.module('../generators/opencode.js', () => ({
      generateOpenCode: mockGenerateOpenCode,
    }));

    mock.module('../utils/templates.js', () => ({
      getModelsForProvider: mockGetModelsForProvider,
      getModelsForHarness: mockGetModelsForHarness,
    }));

    const promptMock = mock(() => ({
      harness: 'opencode',
      provider: 'opencode-go',
      scout: 'opencode-go/deepseek-v4-flash',
      oracle: 'opencode-go/kimi-k2.6',
      architect: 'opencode-go/deepseek-v4-pro',
    }));

    mock.module('inquirer', () => ({
      default: { prompt: promptMock },
    }));

    const { init } = await import('./init.js');
    await init({ harness: 'opencode' });

    expect(promptMock).toHaveBeenCalled();
    expect(mockGetDefaultConfig).toHaveBeenCalledWith('opencode', 'opencode-go');
  });

  test('throws HarnessNotDetectedError when harness not detected and --yes', async () => {
    mockReadConfig.mockReturnValue(null);
    mockGetDefaultConfig.mockReturnValue({} as any);
    mockDetectHarness.mockReturnValue(null);
    mockGetModelsForProvider.mockReturnValue(['haiku', 'sonnet', 'opus']);

    mock.module('../utils/detect.js', () => ({
      detectHarness: mockDetectHarness,
    }));

    mock.module('../utils/config.js', () => ({
      readConfig: mockReadConfig,
      writeConfig: mockWriteConfig,
      getDefaultConfig: mockGetDefaultConfig,
    }));

    mock.module('../generators/claude.js', () => ({
      generateClaude: mockGenerateClaude,
    }));

    mock.module('../generators/opencode.js', () => ({
      generateOpenCode: mockGenerateOpenCode,
    }));

    mock.module('../utils/templates.js', () => ({
      getModelsForProvider: mockGetModelsForProvider,
      getModelsForHarness: mockGetModelsForHarness,
    }));

    mock.module('inquirer', () => ({
      default: { prompt: async () => ({ harness: 'claude', confirm: true }) },
    }));

    const { init } = await import('./init.js');
    await expect(init({ yes: true })).rejects.toThrow('Could not detect harness');
  });
});

describe('update', () => {
  test('throws ConfigNotFoundError when no config', async () => {
    mockReadConfig.mockReturnValue(null);

    mock.module('../utils/config.js', () => ({
      readConfig: mockReadConfig,
      writeConfig: mockWriteConfig,
      getDefaultConfig: mockGetDefaultConfig,
    }));

    mock.module('../generators/claude.js', () => ({
      generateClaude: mockGenerateClaude,
    }));

    mock.module('../generators/opencode.js', () => ({
      generateOpenCode: mockGenerateOpenCode,
    }));

    const { update } = await import('./update.js');
    expect(() => update()).toThrow('.atelier/config.json not found');
  });

  test('calls generateClaude when harness is claude', async () => {
    const config = {
      version: '1.0.0' as const,
      harness: 'claude' as const,
      skills_source: 'martinffx/atelier',
      skills_path: '~/.agents/skills/atelier',
      agents: [
        { template: 'scout', name: 'scout', model: 'haiku' },
        { template: 'oracle', name: 'oracle', model: 'opus' },
        { template: 'architect', name: 'architect', model: 'opus' },
      ],
    };

    mockReadConfig.mockReturnValue(config);

    mock.module('../utils/config.js', () => ({
      readConfig: mockReadConfig,
      writeConfig: mockWriteConfig,
      getDefaultConfig: mockGetDefaultConfig,
    }));

    mock.module('../generators/claude.js', () => ({
      generateClaude: mockGenerateClaude,
    }));

    mock.module('../generators/opencode.js', () => ({
      generateOpenCode: mockGenerateOpenCode,
    }));

    const { update } = await import('./update.js');
    update();

    expect(mockGenerateClaude).toHaveBeenCalledWith(config);
    expect(mockGenerateOpenCode).not.toHaveBeenCalled();
  });

  test('calls generateOpenCode when harness is opencode', async () => {
    const config = {
      version: '1.0.0' as const,
      harness: 'opencode' as const,
      provider: 'opencode-zen' as const,
      skills_source: 'martinffx/atelier',
      skills_path: '~/.agents/skills/atelier',
      agents: [
        { template: 'scout', name: 'scout', model: 'opencode/deepseek-v4-flash' },
        { template: 'oracle', name: 'oracle', model: 'opencode-go/kimi-k2.6' },
        { template: 'architect', name: 'architect', model: 'opencode-go/deepseek-v4-pro' },
      ],
    };

    mockReadConfig.mockReturnValue(config);

    mock.module('../utils/config.js', () => ({
      readConfig: mockReadConfig,
      writeConfig: mockWriteConfig,
      getDefaultConfig: mockGetDefaultConfig,
    }));

    mock.module('../generators/claude.js', () => ({
      generateClaude: mockGenerateClaude,
    }));

    mock.module('../generators/opencode.js', () => ({
      generateOpenCode: mockGenerateOpenCode,
    }));

    const { update } = await import('./update.js');
    update();

    expect(mockGenerateOpenCode).toHaveBeenCalledWith(config);
    expect(mockGenerateClaude).not.toHaveBeenCalled();
  });
});

describe('remove', () => {
  test('throws ConfigNotFoundError when no config', async () => {
    mockReadConfig.mockReturnValue(null);

    mock.module('../utils/config.js', () => ({
      readConfig: mockReadConfig,
      writeConfig: mockWriteConfig,
      getDefaultConfig: mockGetDefaultConfig,
    }));

    const { remove } = await import('./remove.js');
    expect(() => remove()).toThrow('.atelier/config.json not found');
  });
});
