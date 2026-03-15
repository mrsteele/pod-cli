/**
 * Anthropic provider for pod CLI
 * Handles sending prompts to Anthropic's API
 */

import Anthropic from '@anthropic-ai/sdk';

export interface AnthropicOptions {
  apiKey: string;
  model: string;
}

export interface AnthropicResponse {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * Create an Anthropic client
 */
function createClient(apiKey: string): Anthropic {
  return new Anthropic({
    apiKey
  });
}

/**
 * Send a prompt to Anthropic and get the response
 * 
 * @param prompt The prompt content to send
 * @param options Anthropic configuration options
 * @returns The AI response
 */
export async function sendPrompt(
  prompt: string,
  options: AnthropicOptions
): Promise<AnthropicResponse> {
  const client = createClient(options.apiKey);

  const response = await client.messages.create({
    model: options.model,
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ]
  });

  // Extract text content from the response
  const textContent = response.content.find(block => block.type === 'text');
  
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response received from Anthropic');
  }

  return {
    content: textContent.text,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens
    }
  };
}

/**
 * Stream a prompt to Anthropic and yield chunks
 * 
 * @param prompt The prompt content to send
 * @param options Anthropic configuration options
 * @yields Content chunks as they arrive
 */
export async function* streamPrompt(
  prompt: string,
  options: AnthropicOptions
): AsyncGenerator<string> {
  const client = createClient(options.apiKey);

  const stream = await client.messages.stream({
    model: options.model,
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ]
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text;
    }
  }
}
