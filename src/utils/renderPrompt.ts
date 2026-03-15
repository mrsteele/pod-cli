/**
 * Template rendering for pod CLI
 * Handles simple {{variable}} template replacement
 */

/**
 * Render a prompt template with variables
 * 
 * Template format: {{variableName}}
 * 
 * Rules:
 * - Missing variables become empty string
 * - Variable names are trimmed
 * - Supports nested content
 * 
 * @param template The prompt template string
 * @param variables Key-value pairs for variable replacement
 * @returns The rendered prompt
 */
export function renderPrompt(template: string, variables: Record<string, string>): string {
  // Match {{variableName}} pattern
  // Captures the variable name including any whitespace (which we trim)
  const variablePattern = /\{\{\s*([^}]+?)\s*\}\}/g;

  return template.replace(variablePattern, (match, variableName: string) => {
    const trimmedName = variableName.trim();
    
    // Return the variable value, or empty string if not provided
    return variables[trimmedName] ?? '';
  });
}

/**
 * Extract variable names from a template
 * 
 * @param template The prompt template string
 * @returns Array of unique variable names found in the template
 */
export function extractVariables(template: string): string[] {
  const variablePattern = /\{\{\s*([^}]+?)\s*\}\}/g;
  const variables = new Set<string>();

  let match;
  while ((match = variablePattern.exec(template)) !== null) {
    variables.add(match[1].trim());
  }

  return Array.from(variables);
}

/**
 * Check if a template has any variables
 * 
 * @param template The prompt template string
 * @returns True if the template contains variables
 */
export function hasVariables(template: string): boolean {
  const variablePattern = /\{\{\s*[^}]+?\s*\}\}/;
  return variablePattern.test(template);
}

/**
 * Validate that all required variables are provided
 * 
 * @param template The prompt template string
 * @param variables The provided variables
 * @returns Array of missing variable names
 */
export function getMissingVariables(
  template: string,
  variables: Record<string, string>
): string[] {
  const required = extractVariables(template);
  return required.filter(v => !(v in variables));
}
