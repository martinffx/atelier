# Atelier CLI Context

The domain language for the Atelier CLI, which installs agent definitions and harness-native configuration into AI-harness directories.

## Language

**Harness**

The installed AI client environment that Atelier configures. Each harness has one adapter in the registry.

Examples: `claude`, `opencode`, `codex`

_Avoid_: IDE, editor, plugin host, platform

**Provider**

The model-hosting service or cloud provider that supplies the models used by a harness. Providers are independent of harnesses.

Examples: `anthropic`, `openai`, `amazon-bedrock`, `vertexai`, `opencode-zen`, `opencode-go`

_Avoid_: backend, vendor, model family

**Model**

A specific model identifier exposed by a provider and selected for a harness or agent.

Examples: `opus`, `gpt-5.6-sol`, `opencode/kimi-k2.6`

_Avoid_: engine, instance

**Adapter**

A harness-specific module that installs and removes Atelier-managed artifacts for one harness. It translates agnostic agent templates into harness-native agent files and merges Atelier-managed settings into the harness's native configuration file. Adapters perform their own file I/O.

_Avoid_: generator, driver, backend

**Registry**

The static, compile-time collection of adapters keyed by harness name.

_Avoid_: factory, dispatcher, locator

**Skill**

A specialized knowledge module installed by the separate `npx skills` toolchain into `~/.agents/skills`. The Atelier CLI does not install or generate skill files.

_Avoid_: plugin, capability, prompt

**Agent Template**

An agnostic persona definition stored in `agents/{name}.md` inside the Atelier package. It is the source material that adapters translate.

_Avoid_: template file, source agent

**Agent / Subagent**

A harness-specific persona definition generated from a single Agent Template. The CLI uses a static list of agent templates and produces one harness-native agent file per template.

_Avoid_: persona, role, assistant

**AtelierConfig**

The CLI's own persisted JSON configuration. It records the package version, skills source, skills path, and a per-harness section containing provider choice, model selections, and agent list.

_Avoid_: settings, profile, manifest

**HarnessConfig**

A harness's native configuration file (e.g. `opencode.json`, `.claude/settings.json`, `.codex/config.toml`). The adapter merges Atelier-managed keys into this file without overwriting unrelated user settings.

_Avoid_: client config, IDE config

## Resolutions

- **Provider** was previously overloaded to mean both the model family for simple harnesses and the OpenCode provider selection. Provider is now always the model-hosting service. It is persisted explicitly in `OpenCodeConfig` and optionally in `SimpleConfig` with harness defaults (`anthropic` for Claude, `openai` for Codex).
- **Harness** was previously conflated with provider. Harness is strictly the target AI client.
- **Skill installation** was previously listed as an adapter responsibility. Skills are installed by the `npx skills` toolchain; the Atelier CLI does not generate skill-related files.
- **Agent discovery** was previously proposed as dynamic scanning of `agents/*.md`. The CLI uses a static list of agent templates; dynamic scanning is not needed for this refactor.
- **AtelierConfig vs HarnessConfig** is now explicit: `AtelierConfig` is the CLI's persisted state; `HarnessConfig` is the harness's native file, written only by the adapter.
- **fileList and remove** use the same canonical list of Atelier-managed files. `fileList` reports existence; `remove` deletes those files.

## Example dialogue

> **Dev:** We want to support Codex through Amazon Bedrock.
>
> **Maintainer:** That means the harness is `codex`, the provider is `amazon-bedrock`, and the models are the Bedrock-hosted GPT identifiers. The Codex adapter will translate the same agent templates into `.codex/agents/*.toml` files using the Bedrock model names.
>
> **Dev:** Where does the provider get recorded?
>
> **Maintainer:** In the `codex` section of `.atelier/config.json` as an optional `provider` field that defaults to `openai`. The `.codex/config.toml` file only contains harness-native settings; the adapter merges them without touching user edits.
