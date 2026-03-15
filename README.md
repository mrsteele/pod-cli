# pod CLI

The official CLI for prompts registered on [Promptodex](https://promptodex.com) - a prompt registry where prompts are stored and versioned.

## Features

- **Fetch prompts** from the Promptodex registry
- **Render templates** with variables
- **Execute prompts** against configured AI models
- **Print output** to stdout
- **Cache prompts** locally for faster access

## Installation

```bash
npm install -g pod-cli
```

Or use with npx:

```bash
npx pod-cli summarize
```

## Quick Start

1. Create a config file at `~/.pod/config.json`:

```json
{
  "defaultModel": "4.1",
  "vendors": {
    "openai": {
      "apiKey": "sk-your-openai-key"
    },
    "anthropic": {
      "apiKey": "sk-your-anthropic-key"
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

### `pod <slug>`

Fetch and execute a prompt from the registry.

Options:
- `--model <alias>` - Override the model to use
- `--<variable> <value>` - Set template variables
- `-v, --verbose` - Show verbose output

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

- **OpenAI** - GPT-4, GPT-4o, etc.
- **Anthropic** - Claude 3, Claude Sonnet, etc.

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
