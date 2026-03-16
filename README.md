# pod CLI

The official CLI for prompts registered on [Promptodex](https://promptodex.com) - a prompt registry where prompts are stored and versioned.

> **Alias:** You can also use `promptodex` instead of `pod` if there's a naming conflict on your system.

## Features

- **Fetch prompts** from the Promptodex registry
- **Version support** - fetch specific versions with `@version` syntax
- **Render templates** with variables
- **Execute prompts** against configured AI models
- **Print output** to stdout
- **Cache prompts** locally for faster access
- **Interactive setup** wizard for easy configuration

## Installation

```bash
npm install -g pod-cli
```

Or use with npx:

```bash
npx pod-cli summarize
```

## Quick Start

1. Run the setup wizard:

```bash
pod init
```

Or create a config file manually at `~/.pod/config.json`:

```json
{
  "defaultModel": "4.1",
  "vendors": {
    "openai": {
      "apiKey": "sk-your-openai-key"
    },
    "anthropic": {
      "apiKey": "sk-your-anthropic-key"
    },
    "localhost": {
      "port": 11434
    }
  },
  "models": {
    "4.1": {
      "vendor": "openai",
      "model": "gpt-4.1"
    },
    "sonnet": {
      "vendor": "anthropic",
      "model": "claude-sonnet-4"
    },
    "llama": {
      "vendor": "localhost",
      "model": "llama3.2"
    }
  }
}
```

2. Run a prompt:

```bash
pod summarize
```

## Usage

### Run a prompt

```bash
pod <slug>
```

Example:

```bash
pod summarize
```

### Fetch a specific version

Prompts on Promptodex are versioned. Fetch a specific version using `@version` syntax:

```bash
pod summarize@2
```

This fetches version 2 of the "summarize" prompt. Without `@version`, the latest version is fetched.

### Pass variables

Prompts can contain template variables like `{{topic}}`. Pass them with flags:

```bash
pod summarize --topic dogs
```

### Use stdin

Pipe content into the CLI:

```bash
cat article.md | pod summarize
```

Or:

```bash
echo "Hello world" | pod translate --language spanish
```

### Specify a model

Override the prompt's recommended model:

```bash
pod summarize --model sonnet
```

### View configuration

```bash
pod config
```

### Run diagnostics

```bash
pod doctor
```

### Interactive setup

Run the setup wizard to configure your vendors and models:

```bash
pod init
```

This will walk you through selecting a vendor, entering API keys (or port for localhost), and choosing a default model.

## Configuration

The config file is located at `~/.pod/config.json`.

### Structure

```json
{
  "defaultModel": "4.1",
  "vendors": {
    "openai": {
      "apiKey": "sk-xxx"
    },
    "anthropic": {
      "apiKey": "sk-xxx"
    },
    "xai": {
      "apiKey": "xai-xxx"
    },
    "localhost": {
      "port": 11434
    }
  },
  "models": {
    "4.1": {
      "vendor": "openai",
      "model": "gpt-4.1"
    },
    "sonnet": {
      "vendor": "anthropic",
      "model": "claude-sonnet-4"
    },
    "grok": {
      "vendor": "xai",
      "model": "grok-3"
    },
    "llama": {
      "vendor": "localhost",
      "model": "llama3.2"
    }
  }
}
```

### Fields

| Field | Description |
|-------|-------------|
| `defaultModel` | The model alias to use when no model is specified |
| `vendors` | API keys for each AI provider |
| `models` | Model aliases mapping to vendor and model ID |

### Model Resolution

1. If you specify `--model`, that alias is used
2. Otherwise, if the prompt recommends a model, that is used
3. Otherwise, your `defaultModel` is used

## Commands

### `pod <slug>` or `pod <slug>@<version>`

Fetch and execute a prompt from the registry.

Options:
- `--model <alias>` - Override the model to use
- `--<variable> <value>` - Set template variables
- `-v, --verbose` - Show verbose output

Examples:
```bash
pod summarize                    # Latest version
pod summarize@2                  # Specific version
pod summarize --model sonnet     # Override model
pod summarize --topic "AI"       # Pass variables
```

### `pod init`

Interactive setup wizard to configure:
- Preferred AI vendor (OpenAI, Anthropic, xAI, localhost)
- API key or port
- Default model

### `pod config`

Display configuration information including:
- Config file location
- Current settings (with masked API keys)

### `pod doctor`

Run diagnostic checks:
- Config file exists and is valid
- API keys are configured
- Registry is reachable
- Cache directory is writable

## Template Variables

Prompts use `{{variable}}` syntax for templates:

```
Summarize the following about {{topic}}:
{{content}}
```

Pass variables as flags:

```bash
pod my-prompt --topic "machine learning" --content "Your text here"
```

Or use stdin for content:

```bash
cat article.md | pod my-prompt --topic "machine learning"
```

## Cache

Prompts are cached locally at `~/.pod/cache/`.

Structure:
```
~/.pod/cache/{slug}/{version}.json
```

The CLI checks the registry for the latest version and uses the cache if the version matches.

## Supported Providers

- **OpenAI** - GPT-4.1, GPT-4o, o1, etc.
- **Anthropic** - Claude Sonnet 4, Claude Opus 4, Claude 3.5, etc.
- **xAI** - Grok-3, Grok-2, etc.
- **Localhost** - Ollama, LMStudio, or any OpenAI-compatible local server

## Development

### Build

```bash
npm install
npm run build
```

### Run locally

```bash
node bin/pod.js <slug>
```

### Watch mode

```bash
npm run dev
```

## Requirements

- Node.js >= 18

## License

MIT
