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
│   └── doctor.ts         # Diagnostics
├── ai/
│   ├── index.ts          # Unified AI interface
│   ├── openai.ts         # OpenAI SDK integration
│   └── anthropic.ts      # Anthropic SDK integration
├── registry/
│   └── fetchPrompt.ts    # Promptodex API client
└── utils/
    ├── cache.ts          # Local prompt caching (~/.pod/cache)
    ├── checkVersion.ts   # npm version checking
    ├── config.ts         # Config file management (~/.pod/config.json)
    ├── parseArgs.ts      # CLI argument parsing
    ├── renderPrompt.ts   # Template rendering ({{variable}})
    └── resolveModel.ts   # Model resolution logic
```

## Key Files

| File | Purpose |
|------|---------|
| `bin/pod.js` | Executable entry point |
| `src/index.ts` | CLI command definitions |
| `src/commands/run.ts` | Core prompt execution logic |
| `src/utils/config.ts` | Config loading/validation |
| `src/utils/renderPrompt.ts` | `{{variable}}` template replacement |

## Configuration

User config: `~/.pod/config.json`

```json
{
  "defaultModel": "4.1",
  "vendors": {
    "openai": { "apiKey": "sk-xxx" },
    "anthropic": { "apiKey": "sk-xxx" }
  },
  "models": {
    "4.1": { "vendor": "openai", "model": "gpt-4.1" },
    "sonnet": { "vendor": "anthropic", "model": "claude-sonnet-4" }
  }
}
```

## Commands

| Command | Description |
|---------|-------------|
| `pod <slug>` | Execute a prompt |
| `pod <slug> --variable value` | Pass template variables |
| `pod <slug> --model alias` | Override model |
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
- Missing variables become empty strings (not errors)
- Stdin content is appended to the rendered prompt
- Prompts are cached by version: `~/.pod/cache/{slug}/{version}.json`
- Version check runs once per day (cached at `~/.pod/.version-check`)

## Updating This File

When making significant changes:
1. Update the Architecture section if adding/removing modules
2. Update Key Files if changing core functionality
3. Update Commands if adding new CLI commands
4. Keep Design Principles in mind for all changes
