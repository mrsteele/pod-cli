/**
 * Init command for pod CLI
 * Interactive setup wizard to configure the CLI
 */

import chalk from 'chalk';
import readline from 'readline';
import { loadConfig, ensureConfigDir, getConfigPath, PodConfig } from '../utils/config.js';
import fs from 'fs-extra';

// Vendor configurations with their models
const VENDOR_CONFIGS: Record<string, {
  name: string;
  requiresApiKey: boolean;
  requiresPort?: boolean;
  defaultPort?: number;
  models: string[];
}> = {
  openai: {
    name: 'OpenAI',
    requiresApiKey: true,
    models: ['gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-4o', 'gpt-4o-mini', 'o1', 'o1-mini', 'o3-mini']
  },
  anthropic: {
    name: 'Anthropic',
    requiresApiKey: true,
    models: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-3-5-haiku-20241022', 'claude-3-5-sonnet-20241022']
  },
  xai: {
    name: 'xAI',
    requiresApiKey: true,
    models: ['grok-3', 'grok-3-mini', 'grok-2', 'grok-vision-beta']
  },
  localhost: {
    name: 'Localhost (Ollama/LMStudio)',
    requiresApiKey: false,
    requiresPort: true,
    defaultPort: 11434,
    models: ['llama3.2', 'llama3.1', 'llama3', 'mistral', 'mixtral', 'codellama', 'phi3', 'gemma2', 'qwen2.5']
  }
};

interface ReadlineInterface {
  question(query: string): Promise<string>;
  close(): void;
}

/**
 * Create a promise-based readline interface
 */
function createReadline(): ReadlineInterface {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return {
    question: (query: string) => new Promise((resolve) => {
      rl.question(query, resolve);
    }),
    close: () => rl.close()
  };
}

/**
 * Ask a yes/no question
 */
async function askYesNo(rl: ReadlineInterface, question: string, defaultYes = true): Promise<boolean> {
  const hint = defaultYes ? 'Y/n' : 'y/N';
  const answer = await rl.question(`${question} (${hint}): `);
  
  if (!answer.trim()) {
    return defaultYes;
  }
  
  return answer.toLowerCase().startsWith('y');
}

/**
 * Ask a question with numbered options
 */
async function askChoice(
  rl: ReadlineInterface,
  question: string,
  options: string[],
  defaultIndex?: number
): Promise<number> {
  console.log('');
  console.log(question);
  
  options.forEach((opt, i) => {
    const marker = defaultIndex === i ? chalk.cyan(' (default)') : '';
    console.log(`  ${i + 1}. ${opt}${marker}`);
  });
  
  const defaultHint = defaultIndex !== undefined ? ` [${defaultIndex + 1}]` : '';
  const answer = await rl.question(`Enter choice${defaultHint}: `);
  
  if (!answer.trim() && defaultIndex !== undefined) {
    return defaultIndex;
  }
  
  const choice = parseInt(answer, 10);
  
  if (isNaN(choice) || choice < 1 || choice > options.length) {
    console.log(chalk.yellow('Invalid choice, please try again.'));
    return askChoice(rl, question, options, defaultIndex);
  }
  
  return choice - 1;
}

/**
 * Ask for a model selection or custom input
 */
async function askModel(
  rl: ReadlineInterface,
  models: string[],
  currentModel?: string
): Promise<string> {
  console.log('');
  console.log('Select your preferred model:');
  
  const options = [...models, 'Other (enter custom model)'];
  
  // Find default index if current model is in the list
  let defaultIndex = currentModel ? models.indexOf(currentModel) : 0;
  if (defaultIndex === -1) defaultIndex = 0;
  
  options.forEach((opt, i) => {
    const marker = defaultIndex === i ? chalk.cyan(' (default)') : '';
    const current = currentModel === opt ? chalk.dim(' <- current') : '';
    console.log(`  ${i + 1}. ${opt}${marker}${current}`);
  });
  
  const defaultHint = ` [${defaultIndex + 1}]`;
  const answer = await rl.question(`Enter choice${defaultHint}: `);
  
  if (!answer.trim()) {
    return models[defaultIndex];
  }
  
  const choice = parseInt(answer, 10);
  
  if (isNaN(choice) || choice < 1 || choice > options.length) {
    console.log(chalk.yellow('Invalid choice, please try again.'));
    return askModel(rl, models, currentModel);
  }
  
  // If they selected "Other"
  if (choice === options.length) {
    const customModel = await rl.question('Enter custom model name: ');
    return customModel.trim() || models[0];
  }
  
  return models[choice - 1];
}

/**
 * Execute the init command
 * Walks user through interactive setup
 */
export async function init(options: { postinstall?: boolean } = {}): Promise<void> {
  const isPostinstall = options.postinstall === true;
  
  console.log('');
  console.log(chalk.bold('pod CLI Setup'));
  console.log(chalk.dim('─'.repeat(40)));
  console.log('');
  
  const rl = createReadline();
  
  try {
    // Load existing config if any
    const existingConfig = await loadConfig();
    
    if (existingConfig && !isPostinstall) {
      console.log(chalk.dim('Existing configuration found. Values will be pre-filled.'));
      console.log('');
    }
    
    // For postinstall, ask if they want to continue
    if (isPostinstall) {
      const proceed = await askYesNo(rl, 'Would you like to configure pod CLI now?', true);
      
      if (!proceed) {
        console.log('');
        console.log(chalk.dim('Skipping setup. You can run "pod init" later to configure.'));
        rl.close();
        return;
      }
      console.log('');
    }
    
    // Ask for vendor
    const vendorKeys = Object.keys(VENDOR_CONFIGS);
    const vendorNames = vendorKeys.map(k => VENDOR_CONFIGS[k].name);
    vendorNames.push('Other');
    
    // Find current vendor default
    let defaultVendorIndex = 0;
    if (existingConfig?.defaultModel) {
      const defaultModelConfig = existingConfig.models[existingConfig.defaultModel];
      if (defaultModelConfig) {
        const idx = vendorKeys.indexOf(defaultModelConfig.vendor);
        if (idx !== -1) defaultVendorIndex = idx;
      }
    }
    
    const vendorChoice = await askChoice(
      rl,
      'What is your preferred AI vendor?',
      vendorNames,
      defaultVendorIndex
    );
    
    let vendorKey: string;
    let vendorConfig: typeof VENDOR_CONFIGS[string];
    
    if (vendorChoice >= vendorKeys.length) {
      // "Other" selected
      const customVendor = await rl.question('Enter vendor name: ');
      vendorKey = customVendor.trim().toLowerCase() || 'custom';
      vendorConfig = {
        name: customVendor.trim() || 'Custom',
        requiresApiKey: true,
        models: []
      };
    } else {
      vendorKey = vendorKeys[vendorChoice];
      vendorConfig = VENDOR_CONFIGS[vendorKey];
    }
    
    console.log('');
    console.log(chalk.dim(`Selected: ${vendorConfig.name}`));
    
    // Build the new config
    const newConfig: PodConfig = existingConfig ? { ...existingConfig } : {
      defaultModel: undefined,
      vendors: {},
      models: {}
    };
    
    // Initialize vendors and models if not exists
    if (!newConfig.vendors) newConfig.vendors = {};
    if (!newConfig.models) newConfig.models = {};
    
    // Get existing values for this vendor
    const existingVendorConfig = newConfig.vendors[vendorKey];
    const existingApiKey = existingVendorConfig?.apiKey;
    const existingPort = (existingVendorConfig as { port?: number } | undefined)?.port;
    
    // Ask for API key if required
    let apiKey: string | undefined;
    
    if (vendorConfig.requiresApiKey) {
      console.log('');
      const keyHint = existingApiKey 
        ? chalk.dim(` (current: ${existingApiKey.slice(0, 4)}...${existingApiKey.slice(-4)})`)
        : '';
      
      const keyPrompt = `Enter your ${vendorConfig.name} API key${keyHint}: `;
      apiKey = await rl.question(keyPrompt);
      
      // Use existing if empty
      if (!apiKey.trim() && existingApiKey) {
        apiKey = existingApiKey;
        console.log(chalk.dim('Keeping existing API key.'));
      } else if (!apiKey.trim()) {
        console.log(chalk.yellow('Warning: No API key provided. You will need to add one to use this vendor.'));
      }
    }
    
    // Ask for port if localhost
    let port: number | undefined;
    
    if (vendorConfig.requiresPort) {
      console.log('');
      const defaultPort = existingPort || vendorConfig.defaultPort || 11434;
      const portPrompt = `Enter the port for your local LLM server [${defaultPort}]: `;
      const portAnswer = await rl.question(portPrompt);
      
      if (portAnswer.trim()) {
        port = parseInt(portAnswer, 10);
        if (isNaN(port)) {
          console.log(chalk.yellow(`Invalid port, using default: ${defaultPort}`));
          port = defaultPort;
        }
      } else {
        port = defaultPort;
      }
    }
    
    // Find existing model for this vendor
    let existingModel: string | undefined;
    if (existingConfig?.defaultModel) {
      const defaultModelConfig = existingConfig.models[existingConfig.defaultModel];
      if (defaultModelConfig?.vendor === vendorKey) {
        existingModel = defaultModelConfig.model;
      }
    }
    
    // Ask for model
    let selectedModel: string;
    
    if (vendorConfig.models.length > 0) {
      selectedModel = await askModel(rl, vendorConfig.models, existingModel);
    } else {
      console.log('');
      const modelHint = existingModel ? ` [${existingModel}]` : '';
      const customModel = await rl.question(`Enter model name${modelHint}: `);
      selectedModel = customModel.trim() || existingModel || 'default';
    }
    
    // Create a nice alias for the model
    const modelAlias = createModelAlias(selectedModel, vendorKey);
    
    // Update config
    if (vendorConfig.requiresApiKey) {
      newConfig.vendors[vendorKey] = { apiKey: apiKey || '' };
    }
    
    if (vendorConfig.requiresPort && port) {
      newConfig.vendors[vendorKey] = {
        ...(newConfig.vendors[vendorKey] || {}),
        port
      } as any;
    }
    
    newConfig.models[modelAlias] = {
      vendor: vendorKey,
      model: selectedModel
    };
    
    // Set as default model
    newConfig.defaultModel = modelAlias;
    
    // Show summary
    console.log('');
    console.log(chalk.bold('Configuration Summary'));
    console.log(chalk.dim('─'.repeat(40)));
    console.log(`  Vendor: ${chalk.cyan(vendorConfig.name)}`);
    
    if (apiKey) {
      console.log(`  API Key: ${chalk.cyan(apiKey.slice(0, 4) + '...' + apiKey.slice(-4))}`);
    }
    
    if (port) {
      console.log(`  Port: ${chalk.cyan(port.toString())}`);
    }
    
    console.log(`  Model: ${chalk.cyan(selectedModel)}`);
    console.log(`  Alias: ${chalk.cyan(modelAlias)}`);
    console.log(`  Default Model: ${chalk.cyan(modelAlias)}`);
    console.log('');
    
    // Confirm and save
    const save = await askYesNo(rl, 'Save this configuration?', true);
    
    if (save) {
      await ensureConfigDir();
      const configPath = getConfigPath();
      await fs.writeJson(configPath, newConfig, { spaces: 2 });
      
      console.log('');
      console.log(chalk.green('✓ Configuration saved!'));
      console.log(chalk.dim(`  Location: ${configPath}`));
      console.log('');
      console.log('You can now run prompts with:');
      console.log(chalk.cyan('  pod <prompt-slug>'));
      console.log('');
    } else {
      console.log('');
      console.log(chalk.yellow('Configuration not saved.'));
    }
    
  } finally {
    rl.close();
  }
}

/**
 * Create a short alias for a model
 */
function createModelAlias(model: string, vendor: string): string {
  // Common patterns to simplify
  if (model.startsWith('gpt-4.1')) {
    if (model.includes('mini')) return '4.1-mini';
    if (model.includes('nano')) return '4.1-nano';
    return '4.1';
  }
  
  if (model.startsWith('gpt-4o')) {
    if (model.includes('mini')) return '4o-mini';
    return '4o';
  }
  
  if (model.startsWith('claude')) {
    if (model.includes('sonnet-4')) return 'sonnet-4';
    if (model.includes('opus-4')) return 'opus-4';
    if (model.includes('haiku')) return 'haiku';
    if (model.includes('sonnet')) return 'sonnet';
    return model.split('-').slice(0, 2).join('-');
  }
  
  if (model.startsWith('grok')) {
    if (model === 'grok-3') return 'grok';
    if (model === 'grok-3-mini') return 'grok-mini';
    return model;
  }
  
  // For localhost/ollama, use the model name directly
  if (vendor === 'localhost') {
    return model.replace(/[:.]/g, '-');
  }
  
  // Default: use first part of model name
  return model.split(/[-_]/)[0] || model;
}

/**
 * Run setup after npm install (postinstall hook)
 */
export async function postinstallSetup(): Promise<void> {
  // Only run in interactive terminal
  if (!process.stdin.isTTY) {
    return;
  }
  
  await init({ postinstall: true });
}
