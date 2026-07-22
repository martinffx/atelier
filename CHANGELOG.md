# Changelog

## Unreleased

- **breaking:** rename the `recon` agent to `sentinel`. Existing Atelier configuration is migrated automatically and legacy generated files are removed during the next command.

## [2.0.0](https://github.com/martinffx/atelier/compare/v1.4.0...v2.0.0) (2026-07-22)


### ⚠ BREAKING CHANGES

* **agents:** rename recon to sentinel

### Features

* **agents:** rename recon to sentinel ([bf69c50](https://github.com/martinffx/atelier/commit/bf69c50d7f69d0c1f7fc36d1d384914d99def81d))
* **cursor:** add Cursor harness support ([c0ed4e3](https://github.com/martinffx/atelier/commit/c0ed4e356d3a34a085ca5f11344876bdf59ae618))
* **cursor:** add subagent adapter foundation ([7b17972](https://github.com/martinffx/atelier/commit/7b1797267b96b502cb8002cdb1a7bac707978a7d))

## [1.4.0](https://github.com/martinffx/atelier/compare/v1.3.0...v1.4.0) (2026-07-18)


### Features

* **code-commit:** improve commit workflow ([a5e8973](https://github.com/martinffx/atelier/commit/a5e89735ec8623ea24effec326010136cb546735))
* **codex:** add Codex harness support and refactor for multi-harness CLI ([#38](https://github.com/martinffx/atelier/issues/38)) ([ce381d2](https://github.com/martinffx/atelier/commit/ce381d25c8b91734bf84288e1c9522e1a914a5b9))
* **opencode:** add OpenAI provider support ([3f956bd](https://github.com/martinffx/atelier/commit/3f956bd0fb371a00147d2a92c5503d0c853215e2))


### Bug Fixes

* **code-handoff:** write handoffs to project directory ([abd6ec9](https://github.com/martinffx/atelier/commit/abd6ec90cbe614cedff3b0a2059ca9c6743d35ba))

## [1.3.0](https://github.com/martinffx/atelier/compare/v1.2.2...v1.3.0) (2026-07-17)


### Features

* **code-pull-request:** add comment and merge workflows with progressive disclosure ([53e8957](https://github.com/martinffx/atelier/commit/53e89574ae1c37d0c3e868c7bbecee560e38c573))
* **code:** add code-pull-request skill for PR creation ([62e32a6](https://github.com/martinffx/atelier/commit/62e32a6373be02cfad5fd3cb3fa248efcf3cc06c))
* **code:** add code-pull-request skill for PR creation ([e4d2475](https://github.com/martinffx/atelier/commit/e4d24752f610177d6706cf382f3db3c9f5406355))
* **skills:** split oracle-grillme into oracle-grill-me and oracle-domain-modelling ([#40](https://github.com/martinffx/atelier/issues/40)) ([e373c12](https://github.com/martinffx/atelier/commit/e373c12d05d9cde3ddb02fb0fc26ee770fb959a2))
* **spec-brainstorm:** add section-by-section design approval ([f66eb62](https://github.com/martinffx/atelier/commit/f66eb6275780768300218d329bff8882b6d20e5d))
* **spec-brainstorm:** add section-by-section design approval ([9cfb7e7](https://github.com/martinffx/atelier/commit/9cfb7e732fe20c546c2465218a8392dcba7859ad))


### Bug Fixes

* **code-pull-request:** correct description contract and base-branch detection ([73d48c6](https://github.com/martinffx/atelier/commit/73d48c6652f14bcc5224d91e546d219816d27e03))
* **code-pull-request:** resolve code-review findings ([fda9086](https://github.com/martinffx/atelier/commit/fda90860b99ef7ed2fd0731785af0b27251e5d1f))
* **skills:** address review findings from skill consolidation ([cccb1f8](https://github.com/martinffx/atelier/commit/cccb1f8430de7b699900c70d1b33207d771ac664))

## [1.2.2](https://github.com/martinffx/atelier/compare/v1.2.1...v1.2.2) (2026-05-23)


### Bug Fixes

* **skills:** remove user-invocable from code-docs ([beaaaee](https://github.com/martinffx/atelier/commit/beaaaee03d64955a3e8092d250cd4ab318c5d55d))
* **skills:** remove user-invocable from code-docs ([00a2a82](https://github.com/martinffx/atelier/commit/00a2a82ce064bf0a88d2d13de796c4c7e120e472))

## [1.2.1](https://github.com/martinffx/atelier/compare/v1.2.0...v1.2.1) (2026-05-23)


### Bug Fixes

* **cli:** correct skills directory path and add legacy config migration ([14f9611](https://github.com/martinffx/atelier/commit/14f9611bf4d8876844ef86ccc3fce55b203f2bed))
* register missing skills in marketplace.json ([06da766](https://github.com/martinffx/atelier/commit/06da76647ed7c6721a2bc283f9bbd1c212b08456))
* register missing skills in marketplace.json ([9f48099](https://github.com/martinffx/atelier/commit/9f48099e0be5de184c6200105e9b0b839fbcda1a))

## [1.2.0](https://github.com/martinffx/atelier/compare/v1.1.0...v1.2.0) (2026-05-23)


### Features

* **code-debug:** upgrade to six-phase diagnose workflow ([62dec10](https://github.com/martinffx/atelier/commit/62dec1045555947462a447f4579e83b0dee63d17))
* **code-debug:** upgrade to six-phase diagnose workflow ([8df277d](https://github.com/martinffx/atelier/commit/8df277d425ca16dfa63a8bf1949003e3e6aaf87c))
* **code-handoff:** add code-handoff skill ([5ab6f5f](https://github.com/martinffx/atelier/commit/5ab6f5f5d890b024718e3b69103b23c3eb1205ef))
* **oracle-architect:** add vocabulary, evaluation heuristics, and interface design reference ([7c528d3](https://github.com/martinffx/atelier/commit/7c528d308ebc98929cfc6be17e8d5c7444b36607))
* **oracle-architect:** add vocabulary, evaluation heuristics, and interface design reference ([63ee753](https://github.com/martinffx/atelier/commit/63ee75380c4d4be92708539173534566f2033dea))
* **oracle-security:** add security architecture and threat modeling skill ([8fcbd87](https://github.com/martinffx/atelier/commit/8fcbd87943bcb23d51480ed9e9bd702f19817096))
* **oracle-security:** add security architecture and threat modeling skill ([69b6fdc](https://github.com/martinffx/atelier/commit/69b6fdcdf1f2b7732fb339cbf1d64c1fb7252eb7))
* **skills:** add code-handoff skill ([012f467](https://github.com/martinffx/atelier/commit/012f4676d48c7f6799361ca6bdfef12f33a8849e))
* **skills:** add oracle-doubt skill ([adf118b](https://github.com/martinffx/atelier/commit/adf118be197da43195c9ddd052b53f8c714405b5))
* **skills:** add oracle-doubt skill for adversarial review ([447673e](https://github.com/martinffx/atelier/commit/447673eb7904e4d28306360f64329f7874db5b2b))

## [1.1.0](https://github.com/martinffx/atelier/compare/v1.0.2...v1.1.0) (2026-05-23)


### Features

* **skills:** add oracle-grillme socratic interrogation skill ([6ad5ce5](https://github.com/martinffx/atelier/commit/6ad5ce52428863b51fec83880ce8083bb80aa3a0))
* **skills:** add oracle-grillme socratic interrogation skill ([fd21606](https://github.com/martinffx/atelier/commit/fd2160639b82ba335963bec3128d9c6a5b5801b6))
* **skills:** add PR creation workflow to code-commit ([25bb826](https://github.com/martinffx/atelier/commit/25bb8264364cb1c5ee843baea0127eaba3935c78))

## [1.0.2](https://github.com/martinffx/atelier/compare/v1.0.1...v1.0.2) (2026-05-23)


### Bug Fixes

* **package:** remove publish script to prevent recursive npm publish ([cbb1420](https://github.com/martinffx/atelier/commit/cbb14200785f0bf73c6e9f60714e3bf774bac5dd))
* **package:** remove publish script to prevent recursive npm publish in CI ([d2a62dc](https://github.com/martinffx/atelier/commit/d2a62dc3c40301abdf7ddfce86db71c60724b575))

## [1.0.1](https://github.com/martinffx/atelier/compare/v1.0.0...v1.0.1) (2026-05-23)


### Bug Fixes

* **ci:** resolve npm publish authentication failure ([7c57b85](https://github.com/martinffx/atelier/commit/7c57b8504e1f8045b9efeb7ccc5aebfb98e80050))
* **ci:** resolve npm publish authentication failure in release workflow ([5e584bb](https://github.com/martinffx/atelier/commit/5e584bb7bea0f261152cc057dfab444e4c9c1402))

## 1.0.0 (2026-05-22)


### ⚠ BREAKING CHANGES

* consolidate to command-based plugins

### Features

* add claude code atelier plugin marketplace ([06fcf59](https://github.com/martinffx/atelier/commit/06fcf594f4d9889c6ce0196aad468e9e72a931b1))
* Add CLI to configure code harness ([#7](https://github.com/martinffx/atelier/issues/7)) ([64895ae](https://github.com/martinffx/atelier/commit/64895aec069fe13fb1ab739b5db8a4197f67b4e1))
* add git workflow skills - worktree, graphite, and complete-branch ([22e2721](https://github.com/martinffx/atelier/commit/22e272129177e656f07dac76124d1e281f9ed4b4))
* add parallel execution skill for dispatching parallel agents ([cde2e25](https://github.com/martinffx/atelier/commit/cde2e25a7f60d29fb42efc494546df3ea0706bde))
* add planning skill for creating implementation plans with bite-sized tasks ([fc9dd3c](https://github.com/martinffx/atelier/commit/fc9dd3c033bfbec639ea8bdd6efbfd8fff6ec5f8))
* add research skill for systematic exploration before planning ([d34bdbc](https://github.com/martinffx/atelier/commit/d34bdbcff25c5a93f3624a59f488f8d9d04300d0))
* add spec:install skill and remove command shims ([7d6c693](https://github.com/martinffx/atelier/commit/7d6c693f195a570ace08477be68c9a2e22d7318b))
* add using-atelier meta skill for skill invocation governance ([e35bee5](https://github.com/martinffx/atelier/commit/e35bee508b725b04a8b868d00c733ac879f73007))
* add verification skill for evidence-based completion claims ([b2faaf2](https://github.com/martinffx/atelier/commit/b2faaf27dca2a3b1363bfdf4d3f7fb67059686b7))
* **agents:** add oracle, architect, clerk agents and spec commands ([8eea909](https://github.com/martinffx/atelier/commit/8eea909100297dc4164b9c6a62e9f917a7ec0943))
* **code:review:** add agent dispatch and skill loading ([f629fd9](https://github.com/martinffx/atelier/commit/f629fd92674ed2bc8f95d980d2eb518f3cdd6f92))
* **code:review:** add gfreview integration with line-by-line comments ([586cf53](https://github.com/martinffx/atelier/commit/586cf53070e9dc7579d0e9db51c7028ce6652c7c))
* enhance architect with planning patterns and execution handoff ([f80416a](https://github.com/martinffx/atelier/commit/f80416a0e80f6985d837ffb5149c8de3d0c189e7))
* enhance debugging with systematic phases, iron law, and rationalization prevention ([01432c3](https://github.com/martinffx/atelier/commit/01432c3525761ff41a23a857ffbeba2605b01268))
* enhance product discovery with brainstorming patterns and hard gates ([0dcaa39](https://github.com/martinffx/atelier/commit/0dcaa39bdb247c2cba469f2d30d455dc716dc6d5))
* enhance testing with domain boundary TDD, iron law, and verification checklist ([5e8baa9](https://github.com/martinffx/atelier/commit/5e8baa98b70b7d12e9cb1f1fe4021d7fc63004b3))
* **hooks:** add SessionStart hook to load spec:orchestrator ([6efcdf4](https://github.com/martinffx/atelier/commit/6efcdf41bf99862ee01eff7f320b3dfa5d7e2a38))
* **plugin:** add code plugin with code-review and conventional-commit skills ([21ca1e3](https://github.com/martinffx/atelier/commit/21ca1e39f22cde25a9a6863f8fbcd43f7fe2462e))
* **python:** add comprehensive Python ecosystem patterns plugin ([2a549c5](https://github.com/martinffx/atelier/commit/2a549c594f87643dac43b926db955f90aebfc7ed))
* **skills:** add 5 new skills ([213aa61](https://github.com/martinffx/atelier/commit/213aa61bfe7e1259ee2e813b989f852b2757c2ee))
* **skills:** add code-review and conventional-commit skills ([c0761b0](https://github.com/martinffx/atelier/commit/c0761b023160226e7d5a2fc468685903f6f51111))
* **skills:** add product, architect, testing, and functional-patterns skills ([cd58be3](https://github.com/martinffx/atelier/commit/cd58be3a949533d7d8240a9d8f71bac84ab91b06))
* **skills:** add spec:design skill for codebase research and solution design ([31d7980](https://github.com/martinffx/atelier/commit/31d7980789a314408676b2854e5c203d61a53473))
* **skills:** add spec:implement skill for executing tasks from approved plan ([1318d9d](https://github.com/martinffx/atelier/commit/1318d9d72f424fbd91166d9a90c4529e334e925d))
* **skills:** add spec:plan skill for implementation planning and task creation ([b0e51b5](https://github.com/martinffx/atelier/commit/b0e51b5e30b2466a1a3f26879b6deaee136a83e7))
* **skills:** add spec:subagents skill for subagent dispatch patterns ([097d8cf](https://github.com/martinffx/atelier/commit/097d8cf2520ae6095dae5eb79fa8de5df9b5f2cf))
* **skills:** add stacked-commit skill using Graphite ([a91ee82](https://github.com/martinffx/atelier/commit/a91ee82baa333bd013cef102153f0bd9de280afa))
* **skills:** add using-atelier skill for skill invocation guidance ([58b0297](https://github.com/martinffx/atelier/commit/58b02970267848bdf36d8cc7d10dbff6c4e1c538))
* **skills:** add using-git-worktrees skill ([55a31c9](https://github.com/martinffx/atelier/commit/55a31c903de752bedd1cf7c2bda2ed3ba396b5a1))
* **spec:** add beads skill for task tracker CLI reference ([3ba4207](https://github.com/martinffx/atelier/commit/3ba4207c61a0afce4d54273300f1e17644c764d7))
* **spec:** add dedicated /spec:init command with guided setup ([1fd074c](https://github.com/martinffx/atelier/commit/1fd074c10470db0705a28564df086c2911618651))
* **spec:** add structured workflows with parallel execution and validation ([1671622](https://github.com/martinffx/atelier/commit/1671622b70c15c8a3a1abe662d82857847040a2e))
* **spec:** separate workflow into distinct phase commands with validation ([24fb366](https://github.com/martinffx/atelier/commit/24fb366966118a25c30abc7a5d86b5044b530a60))
* **typescript:** add build-tools skill with tooling references ([acb82e8](https://github.com/martinffx/atelier/commit/acb82e894d3e8ac834bf1612af000844222b9822))
* **typescript:** add comprehensive testing skill for Vitest and MSW ([42c751f](https://github.com/martinffx/atelier/commit/42c751f4acbe93461ec457435b2181c57ee143f4))
* **typescript:** add Effect-TS skill for functional effects ([#1](https://github.com/martinffx/atelier/issues/1)) ([558e81c](https://github.com/martinffx/atelier/commit/558e81c7cd3faf710206d7cdb4bdc7783e77f8c9))
* **typescript:** add production patterns from exchequerio ([f217d20](https://github.com/martinffx/atelier/commit/f217d2027eb968ae5728fe64914d96b479dc7f28))
* **typescript:** add sqlite, d1, and do to drizzle ([0886bb0](https://github.com/martinffx/atelier/commit/0886bb0525f34fa8ade24d9c1cd7b1b75ef03e9a))
* **typescript:** enhance dynamodb-toolbox skill with production patterns ([e115371](https://github.com/martinffx/atelier/commit/e11537116d880cdfc83db15e267b77f8e554a7a5))
* update methodology with superpowers integration, hard gates, verification, and domain boundary testing ([d68b133](https://github.com/martinffx/atelier/commit/d68b1332d97c4edde871ed91278a577f98c40a73))


### Bug Fixes

* **architect:** correct dependency inversion principle wording ([9c42952](https://github.com/martinffx/atelier/commit/9c429527cbf6d8b0567d9fc8f9bed635949bf76d))
* **marketplace:** correct schema format for Claude Code validation ([5135e64](https://github.com/martinffx/atelier/commit/5135e64b56ba78574293ecca3c1669708149a028))
* **skills:** update spec skills with embedded schemas and skill loading ([be76e7c](https://github.com/martinffx/atelier/commit/be76e7cd9ad132ba87c9dc3b419f2c88d5e44ded))
* **skills:** update spec skills with skill loading and fix spec:subagents references ([498b3dc](https://github.com/martinffx/atelier/commit/498b3dc2ed91b5cd0e3ae9a55ef0d4e330da0422))
* update skill names to match folder names ([649d1a4](https://github.com/martinffx/atelier/commit/649d1a4ca64a1691f407fe23f0f6d1550c10ac18))
* **using-git-worktrees:** update integration section for atelier plugins ([e508f30](https://github.com/martinffx/atelier/commit/e508f30f38c40182c3781ab2b1113b5e97018ff4))


### Code Refactoring

* consolidate to command-based plugins ([8963fe4](https://github.com/martinffx/atelier/commit/8963fe4b6f189e67eae5eecccfeed6a6658ba33b))

## [0.1.0] - 2026-05-08

### Added

- CLI installer (`bunx @martinffx/atelier@latest`) with `init`, `update`, `remove` commands
- Claude Code generator: `.claude/settings.json` with model + hooks, `.claude/agents/*.md`
- OpenCode generator: `opencode.json` with primary agents, `.opencode/agents/*.md` subagents
- Harness auto-detection (CLAUDE_PLUGIN_ROOT env var, .opencode/ directory)
- Model registry with per-agent defaults for both harnesses
- Agent template fetching from GitHub, injected with harness-specific model
- Skills bundled in npm package, installed via `--all` flag
- 34 universal skills across spec-, oracle-, code-, typescript-, and python- namespaces
- Claude Code atelier plugin marketplace
- Spec-driven development workflow skills (research, plan, implement, finish, subagents)
- Dedicated /spec:init command with guided setup
- Structured workflows with parallel execution and validation
- Deep thinking agents (oracle, architect, scout)
- Python ecosystem patterns plugin
- TypeScript ecosystem patterns (Effect-TS, Drizzle ORM, DynamoDB Toolbox, Fastify, testing)
- Git workflow skills (worktrees, Graphite stacked commits, branch completion)
- Code review skill with agent dispatch and gfreview integration
- Conventional commit skill
- Beads task tracker CLI reference
- SessionStart hook to load spec:orchestrator

### Changed

- Agent templates (`agents/*.md`) now harness-agnostic — `model` field injected by CLI
- Methodology updated with superpowers integration, hard gates, verification, and domain boundary testing

### Fixed

- Various skill name consistency fixes
- Marketplace schema format corrected for Claude Code validation

[0.1.0]: https://github.com/martinffx/atelier/releases/tag/v0.1.0
