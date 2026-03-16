/**
 * Localhost/Ollama provider for pod CLI
 * Handles sending prompts to local LLM servers (Ollama, LMStudio, etc.)
 * Uses OpenAI-compatible API endpoint
 */

export interface LocalhostOptions {
  port: number;
  model: string;
  host?: string;
}

export interface LocalhostResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Send a prompt to a local LLM server
 * Uses OpenAI-compatible chat completions API
 * 
 * @param prompt The prompt content to send
 * @param options Localhost configuration options
 * @returns The AI response
 */
export async function sendPrompt(
  prompt: string,
  options: LocalhostOptions
): Promise<LocalhostResponse> {
  const host = options.host || 'localhost';
  const baseUrl = `http://${host}:${options.port}`;
  
  // Try OpenAI-compatible endpoint first (works with Ollama, LMStudio, etc.)
  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: options.model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      stream: false
    })
  });

  if (!response.ok) {
    // Try Ollama native endpoint as fallback
    return sendPromptOllamaNative(prompt, options);
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
    throw new Error('No response received from local LLM');
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
 * Send prompt using Ollama's native API
 * Fallback for when OpenAI-compatible endpoint doesn't work
 */
async function sendPromptOllamaNative(
  prompt: string,
  options: LocalhostOptions
): Promise<LocalhostResponse> {
  const host = options.host || 'localhost';
  const baseUrl = `http://${host}:${options.port}`;
  
  const response = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: options.model,
      prompt: prompt,
      stream: false
    })
  });

  if (!response.ok) {
    throw new Error(`Local LLM request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as {
    response: string;
    eval_count?: number;
    prompt_eval_count?: number;
  };

  if (!data.response) {
    throw new Error('No response received from local LLM');
  }

  return {
    content: data.response,
    usage: data.eval_count ? {
      promptTokens: data.prompt_eval_count || 0,
      completionTokens: data.eval_count,
      totalTokens: (data.prompt_eval_count || 0) + data.eval_count
    } : undefined
  };
}

/**
 * Stream a prompt to local LLM server and yield chunks
 * 
 * @param prompt The prompt content to send
 * @param options Localhost configuration options
 * @yields Content chunks as they arrive
 */
export async function* streamPrompt(
  prompt: string,
  options: LocalhostOptions
): AsyncGenerator<string> {
  const host = options.host || 'localhost';
  const baseUrl = `http://${host}:${options.port}`;
  
  // Try OpenAI-compatible streaming endpoint
  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
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
    // Fallback to non-streaming
    const result = await sendPrompt(prompt, options);
    yield result.content;
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    
    // Process SSE lines
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
          // Ignore invalid JSON lines
        }
      }
    }
  }
}

/**
 * Check if a localhost LLM server is reachable
 * 
 * @param port The port to check
 * @param host The host to check (default: localhost)
 * @returns True if the server is reachable
 */
export async function isReachable(port: number, host = 'localhost'): Promise<boolean> {
  try {
    const response = await fetch(`http://${host}:${port}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    });
    return response.ok;
  } catch {
    // Try OpenAI-compatible endpoint
    try {
      const response = await fetch(`http://${host}:${port}/v1/models`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * List available models from a localhost LLM server
 * 
 * @param port The port to check
 * @param host The host to check (default: localhost)
 * @returns List of available model names
 */
export async function listModels(port: number, host = 'localhost'): Promise<string[]> {
  try {
    // Try Ollama endpoint first
    const response = await fetch(`http://${host}:${port}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    
    if (response.ok) {
      const data = await response.json() as {
        models: Array<{ name: string }>;
      };
      return data.models?.map(m => m.name) || [];
    }
  } catch {
    // Try OpenAI-compatible endpoint
    try {
      const response = await fetch(`http://${host}:${port}/v1/models`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        const data = await response.json() as {
          data: Array<{ id: string }>;
        };
        return data.data?.map(m => m.id) || [];
      }
    } catch {
      // Ignore
    }
  }
  
  return [];
}
