# AGENTS.md

This file contains essential context for AI agents working on this codebase.

## Project Overview

**pod-cli** is the official CLI for prompts registered on [promptodex.com](https://promptodex.com). It allows users to fetch, render, and execute prompts against configured AI models.

## Core Workflow

1. User runs `pod <slug>` (e.g., `pod summarize`)
2. CLI fetches prompt from `https://promptodex.com/api/v1/prompts/{slug}`
3. Template variables are rendered (e.g., `{{topic}}` → user-provided value)
4. Model is resolved (user override → prompt recommendation → default)
5. Prompt is sent to AI provider (OpenAI or Anthropic)
6. Response is printed to stdout

## Architecture

```
src/
├── index.ts              # CLI entry point (Commander-based)
├── commands/
│   ├── run.ts            # Main command - execute prompts
│   ├── config.ts         # Show configuration
│   ├── doctor.ts         # Diagnostics
│   └── init.ts           # Interactive setup wizard
├── ai/
│   ├── index.ts          # Unified AI interface
│   ├── openai.ts         # OpenAI SDK integration
│   ├── anthropic.ts      # Anthropic SDK integration
│   ├── xai.ts            # xAI (Grok) integration
│   └── localhost.ts      # Ollama/LMStudio integration
├── registry/
│   └── fetchPrompt.ts    # Promptodex API client
└── utils/
    ├── cache.ts          # Local prompt caching (~/.pod/cache)
    ├── checkVersion.ts   # npm version checking
    ├── config.ts         # Config file management (~/.pod/config.json)
    ├── parseArgs.ts      # CLI argument parsing (including @version)
    ├── renderPrompt.ts   # Template rendering ({{variable}})
    └── resolveModel.ts   # Model resolution logic
```

## Key Files

| File | Purpose |
|------|---------|
| `bin/pod.js` | Executable entry point |
| `bin/postinstall.js` | Postinstall setup script |
| `src/index.ts` | CLI command definitions |
| `src/commands/run.ts` | Core prompt execution logic |
| `src/commands/init.ts` | Interactive setup wizard |
| `src/utils/config.ts` | Config loading/validation |
| `src/utils/renderPrompt.ts` | `{{variable}}` template replacement |
| `src/ai/localhost.ts` | Ollama/LMStudio localhost support |

## Configuration

User config: `~/.pod/config.json`

```json
{
  "defaultModel": "4.1",
  "vendors": {
    "openai": { "apiKey": "sk-xxx" },
    "anthropic": { "apiKey": "sk-xxx" },
    "xai": { "apiKey": "xai-xxx" },
    "localhost": { "port": 11434 }
  },
  "models": {
    "4.1": { "vendor": "openai", "model": "gpt-4.1" },
    "sonnet": { "vendor": "anthropic", "model": "claude-sonnet-4" },
    "grok": { "vendor": "xai", "model": "grok-3" },
    "llama": { "vendor": "localhost", "model": "llama3.2" }
  }
}
```

## Commands

| Command | Description |
|---------|-------------|
| `pod <slug>` | Execute a prompt |
| `pod <slug>@<version>` | Execute a specific version of a prompt |
| `pod <slug> --variable value` | Pass template variables |
| `pod <slug> --model alias` | Override model |
| `pod init` | Interactive setup wizard |
| `pod config` | Show configuration |
| `pod doctor` | Run diagnostics |

## Dependencies

- **commander** - CLI framework
- **chalk** - Terminal colors
- **openai** - OpenAI SDK
- **@anthropic-ai/sdk** - Anthropic SDK
- **fs-extra** - File system utilities

## Testing

Tests are in `src/__tests__/` using Vitest.

Run tests:
```bash
npm test
```

Test files:
- `renderPrompt.test.ts` - Template rendering
- `parseArgs.test.ts` - CLI argument parsing
- `resolveModel.test.ts` - Model resolution logic
- `config.test.ts` - Configuration utilities

Tests run automatically on every push to `main` via GitHub Actions (`.github/workflows/ci.yml`).

## Development

```bash
npm install      # Install dependencies
npm run build    # Compile TypeScript
npm run dev      # Watch mode
npm test         # Run tests
```

## Design Principles

1. **Simplicity** - Minimal abstractions, readable code
2. **Transparency** - Clear error messages, verbose mode
3. **Modularity** - Each file has a single responsibility
4. **Small dependencies** - Only essential packages

## Important Notes

- Template syntax: `{{variableName}}` (simple replacement, no logic)
- Version syntax: `slug@version` (e.g., `summary@2` fetches version 2)
- Missing variables become empty strings (not errors)
- Stdin content is appended to the rendered prompt
- Prompts are cached by version: `~/.pod/cache/{slug}/{version}.json`
- Version check runs once per day (cached at `~/.pod/.version-check`)
- Supported vendors: `openai`, `anthropic`, `xai`, `localhost`
- Localhost vendors (Ollama, LMStudio) use port config instead of API key

## Updating This File

When making significant changes:
1. Update the Architecture section if adding/removing modules
2. Update Key Files if changing core functionality
3. Update Commands if adding new CLI commands
4. Keep Design Principles in mind for all changes

## Documentation Sync

**IMPORTANT:** When making user-facing changes (new features, changed behavior, new flags):
1. Update `README.md` with the new feature/behavior
2. Update `--help` text in `src/index.ts` if relevant
3. These should reflect any change that users need to know about

Examples of changes requiring doc updates:
- New commands or flags
- New versioning syntax (e.g., `slug@version`)
- New supported vendors
- Changed default behavior

## Testing Requirements

**CRITICAL:** All tests must pass before changes are considered complete.
1. Run `npm test` after making changes
2. Add new tests when adding new functionality
3. Update existing tests when changing behavior
4. Tests are located in `src/__tests__/`

Test files should cover:
- New utility functions
- Changed argument parsing
- New vendor support
- Edge cases for new features
