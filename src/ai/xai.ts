/**
 * xAI (Grok) provider for pod CLI
 * Handles sending prompts to xAI's API
 * Uses OpenAI-compatible API endpoint
 */

export interface XAIOptions {
  apiKey: string;
  model: string;
}

export interface XAIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

const XAI_BASE_URL = 'https://api.x.ai/v1';

/**
 * Send a prompt to xAI and get the response
 * 
 * @param prompt The prompt content to send
 * @param options xAI configuration options
 * @returns The AI response
 */
export async function sendPrompt(
  prompt: string,
  options: XAIOptions
): Promise<XAIResponse> {
  const response = await fetch(`${XAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${options.apiKey}`
    },
    body: JSON.stringify({
      model: options.model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`xAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as {
    choices: Array<{
      message: {
        content: string;
      };
    }>;
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  };

  const choice = data.choices?.[0];
  
  if (!choice?.message?.content) {
    throw new Error('No response received from xAI');
  }

  return {
    content: choice.message.content,
    usage: data.usage ? {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens
    } : undefined
  };
}

/**
 * Stream a prompt to xAI and yield chunks
 * 
 * @param prompt The prompt content to send
 * @param options xAI configuration options
 * @yields Content chunks as they arrive
 */
export async function* streamPrompt(
  prompt: string,
  options: XAIOptions
): AsyncGenerator<string> {
  const response = await fetch(`${XAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${options.apiKey}`
    },
    body: JSON.stringify({
      model: options.model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      stream: true
    })
  });

  if (!response.ok || !response.body) {
    throw new Error(`xAI API error: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        
        if (data === '[DONE]') {
          return;
        }
        
        try {
          const parsed = JSON.parse(data) as {
            choices?: Array<{
              delta?: {
                content?: string;
              };
            }>;
          };
          
          const content = parsed.choices?.[0]?.delta?.content;
          
          if (content) {
            yield content;
          }
        } catch {
          // Ignore invalid JSON
        }
      }
    }
  }
}
