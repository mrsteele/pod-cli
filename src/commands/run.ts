/**
 * Run command for pod CLI
 * Executes a prompt from the Promptodex registry
 */

import chalk from 'chalk';
import { loadConfig, PodConfig } from '../utils/config.js';
import { fetchPrompt } from '../registry/fetchPrompt.js';
import { renderPrompt, getMissingVariables } from '../utils/renderPrompt.js';
import { hasStdin, readStdin, buildPromptContent } from '../utils/parseArgs.js';
import { resolveModel, getModelDisplayName } from '../utils/resolveModel.js';
import { sendPrompt } from '../ai/index.js';
import { checkVersion, formatOutdatedWarning } from '../utils/checkVersion.js';

export interface RunOptions {
  slug: string;
  version?: number;
  variables: Record<string, string>;
  model?: string;
  verbose?: boolean;
}

/**
 * Execute the run command
 * 
 * Flow:
 * 1. Load config
 * 2. Check for stdin input
 * 3. Fetch prompt from registry
 * 4. Render template with variables
 * 5. Resolve model configuration
 * 6. Send to AI provider
 * 7. Print response
 */
export async function run(options: RunOptions): Promise<void> {
  const { slug, version, variables, model: modelOverride, verbose } = options;

  // Check for CLI updates (async, non-blocking)
  checkVersion().then(result => {
    const warning = formatOutdatedWarning(result);
    if (warning) {
      console.error(chalk.yellow(warning));
      console.error('');
    }
  }).catch(() => {
    // Ignore version check errors
  });

  // Load configuration
  const config = await loadConfig();
  
  if (!config) {
    console.error(chalk.red('Error: No configuration found.'));
    console.error('');
    console.error('Create a config file at ~/.pod/config.json');
    console.error('');
    console.error('Example:');
    console.error(chalk.dim(JSON.stringify({
      defaultModel: '4.1',
      vendors: {
        openai: { apiKey: 'sk-xxx' }
      },
      models: {
        '4.1': { vendor: 'openai', model: 'gpt-4.1' }
      }
    }, null, 2)));
    process.exit(1);
  }

  // Check for stdin input
  let stdinContent: string | undefined;
  
  if (await hasStdin()) {
    if (verbose) {
      console.error(chalk.dim('Reading from stdin...'));
    }
    stdinContent = await readStdin();
  }

  // Fetch prompt from registry
  const slugDisplay = version ? `${slug}@${version}` : slug;
  if (verbose) {
    console.error(chalk.dim(`Fetching prompt: ${slugDisplay}`));
  }

  let prompt;
  try {
    prompt = await fetchPrompt(slug, version);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(chalk.red(`Error fetching prompt: ${message}`));
    process.exit(1);
  }

  if (verbose) {
    console.error(chalk.dim(`Prompt: ${prompt.slug} (v${prompt.version})`));
  }

  // Check for missing variables (warning only, they become empty strings)
  const missing = getMissingVariables(prompt.content, variables);
  if (missing.length > 0 && verbose) {
    console.error(chalk.yellow(`Warning: Missing variables: ${missing.join(', ')}`));
  }

  // Render the template
  const renderedTemplate = renderPrompt(prompt.content, variables);
  
  // Build final prompt content (with stdin if available)
  const finalContent = buildPromptContent(renderedTemplate, stdinContent);

  if (verbose) {
    console.error(chalk.dim('---'));
    console.error(chalk.dim('Prompt content:'));
    console.error(chalk.dim(finalContent));
    console.error(chalk.dim('---'));
  }

  // Resolve model
  let resolvedModel;
  try {
    resolvedModel = resolveModel(config, modelOverride, prompt.model);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(chalk.red(`Error resolving model: ${message}`));
    process.exit(1);
  }

  if (verbose) {
    console.error(chalk.dim(`Using model: ${getModelDisplayName(resolvedModel)}`));
  }

  // Send to AI provider
  if (verbose) {
    console.error(chalk.dim('Sending to AI...'));
  }

  try {
    const response = await sendPrompt(finalContent, resolvedModel);
    
    // Print response to stdout
    console.log(response.content);
    
    if (verbose && response.usage) {
      console.error('');
      console.error(chalk.dim(`Tokens: ${response.usage.inputTokens ?? '?'} in, ${response.usage.outputTokens ?? '?'} out`));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(chalk.red(`Error from AI provider: ${message}`));
    process.exit(1);
  }
}
