/**
 * AI provider module index
 * Provides a unified interface for different AI providers
 */

import * as openai from './openai.js';
import * as anthropic from './anthropic.js';
import { ResolvedModel } from '../utils/resolveModel.js';

export interface AIResponse {
  content: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

/**
 * Send a prompt to the appropriate AI provider
 * 
 * @param prompt The prompt content to send
 * @param model The resolved model configuration
 * @returns The AI response
 */
export async function sendPrompt(
  prompt: string,
  model: ResolvedModel
): Promise<AIResponse> {
  switch (model.vendor.toLowerCase()) {
    case 'openai': {
      const response = await openai.sendPrompt(prompt, {
        apiKey: model.apiKey,
        model: model.model
      });
      return {
        content: response.content,
        usage: response.usage ? {
          inputTokens: response.usage.promptTokens,
          outputTokens: response.usage.completionTokens,
          totalTokens: response.usage.totalTokens
        } : undefined
      };
    }
    
    case 'anthropic': {
      const response = await anthropic.sendPrompt(prompt, {
        apiKey: model.apiKey,
        model: model.model
      });
      return {
        content: response.content,
        usage: response.usage ? {
          inputTokens: response.usage.inputTokens,
          outputTokens: response.usage.outputTokens
        } : undefined
      };
    }
    
    default:
      throw new Error(`Unsupported AI vendor: ${model.vendor}`);
  }
}

/**
 * Stream a prompt to the appropriate AI provider
 * 
 * @param prompt The prompt content to send
 * @param model The resolved model configuration
 * @yields Content chunks as they arrive
 */
export async function* streamPrompt(
  prompt: string,
  model: ResolvedModel
): AsyncGenerator<string> {
  switch (model.vendor.toLowerCase()) {
    case 'openai':
      yield* openai.streamPrompt(prompt, {
        apiKey: model.apiKey,
        model: model.model
      });
      break;
    
    case 'anthropic':
      yield* anthropic.streamPrompt(prompt, {
        apiKey: model.apiKey,
        model: model.model
      });
      break;
    
    default:
      throw new Error(`Unsupported AI vendor: ${model.vendor}`);
  }
}
