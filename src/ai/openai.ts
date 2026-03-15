/**
 * OpenAI provider for pod CLI
 * Handles sending prompts to OpenAI's API
 */

import OpenAI from 'openai';

export interface OpenAIOptions {
  apiKey: string;
  model: string;
}

export interface OpenAIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Create an OpenAI client
 */
function createClient(apiKey: string): OpenAI {
  return new OpenAI({
    apiKey
  });
}

/**
 * Send a prompt to OpenAI and get the response
 * 
 * @param prompt The prompt content to send
 * @param options OpenAI configuration options
 * @returns The AI response
 */
export async function sendPrompt(
  prompt: string,
  options: OpenAIOptions
): Promise<OpenAIResponse> {
  const client = createClient(options.apiKey);

  const response = await client.chat.completions.create({
    model: options.model,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ]
  });

  const choice = response.choices[0];
  
  if (!choice || !choice.message.content) {
    throw new Error('No response received from OpenAI');
  }

  return {
    content: choice.message.content,
    usage: response.usage ? {
      promptTokens: response.usage.prompt_tokens,
      completionTokens: response.usage.completion_tokens,
      totalTokens: response.usage.total_tokens
    } : undefined
  };
}

/**
 * Stream a prompt to OpenAI and yield chunks
 * 
 * @param prompt The prompt content to send
 * @param options OpenAI configuration options
 * @yields Content chunks as they arrive
 */
export async function* streamPrompt(
  prompt: string,
  options: OpenAIOptions
): AsyncGenerator<string> {
  const client = createClient(options.apiKey);

  const stream = await client.chat.completions.create({
    model: options.model,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ],
    stream: true
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}
