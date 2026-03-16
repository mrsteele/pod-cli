/**
 * Argument parsing utilities for pod CLI
 * Handles extracting variables from CLI arguments
 */

export interface ParsedArgs {
  slug: string;
  version?: number;
  variables: Record<string, string>;
  model?: string;
}

/**
 * Parse version from slug (e.g., "summary@2" -> { slug: "summary", version: 2 })
 */
export function parseSlugVersion(slugWithVersion: string): { slug: string; version?: number } {
  const atIndex = slugWithVersion.lastIndexOf('@');
  
  if (atIndex === -1 || atIndex === 0) {
    return { slug: slugWithVersion };
  }
  
  const slug = slugWithVersion.slice(0, atIndex);
  const versionStr = slugWithVersion.slice(atIndex + 1);
  const version = parseInt(versionStr, 10);
  
  if (isNaN(version) || version < 1) {
    // Not a valid version number, treat the whole thing as the slug
    return { slug: slugWithVersion };
  }
  
  return { slug, version };
}

/**
 * Parse CLI arguments to extract slug and variables
 * 
 * Variables are passed as --key value pairs
 * Special flags:
 *   --model <alias>  Override the model to use
 * 
 * @param args Command line arguments (excluding node and script path)
 * @returns Parsed arguments with slug and variables
 */
export function parseArgs(args: string[]): ParsedArgs {
  if (args.length === 0) {
    throw new Error('No prompt slug provided');
  }

  const { slug, version } = parseSlugVersion(args[0]);
  const variables: Record<string, string> = {};
  let model: string | undefined;

  let i = 1;
  while (i < args.length) {
    const arg = args[i];

    // Check if it's a flag (starts with --)
    if (arg.startsWith('--')) {
      const key = arg.slice(2); // Remove --
      
      if (!key) {
        i++;
        continue;
      }

      // Get the next argument as the value
      const value = args[i + 1];
      
      // Check if value exists and is not another flag
      if (value !== undefined && !value.startsWith('--')) {
        if (key === 'model') {
          model = value;
        } else {
          variables[key] = value;
        }
        i += 2;
      } else {
        // Flag without value, treat as boolean true
        variables[key] = 'true';
        i++;
      }
    } else {
      // Skip non-flag arguments after the slug
      i++;
    }
  }

  return {
    slug,
    version,
    variables,
    model
  };
}

/**
 * Check if stdin has data available
 */
export async function hasStdin(): Promise<boolean> {
  return !process.stdin.isTTY;
}

/**
 * Read all data from stdin
 */
export async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    
    process.stdin.setEncoding('utf-8');
    
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    
    process.stdin.on('end', () => {
      resolve(data.trim());
    });
    
    process.stdin.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Build the final prompt content
 * Combines rendered template with optional stdin input
 */
export function buildPromptContent(renderedTemplate: string, stdinContent?: string): string {
  if (stdinContent) {
    return `${renderedTemplate}\n\n${stdinContent}`;
  }
  return renderedTemplate;
}
