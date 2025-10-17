// Service to interact with Ollama API

interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
  };
}

interface OllamaEmbedRequest {
  model: string;
  prompt: string;
}

const OLLAMA_BASE_URL = "http://localhost:11434";

/**
 * Generate text response from Ollama
 */
export async function generateResponse(
  prompt: string,
  model: string = "mistral:7b"
): Promise<string> {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
      },
    } as OllamaGenerateRequest),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.statusText}`);
  }

  const data = (await response.json()) as { response: string };
  return data.response;
}

/**
 * Generate embeddings for RAG
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "nomic-embed-text",
      prompt: text,
    } as OllamaEmbedRequest),
  });

  if (!response.ok) {
    throw new Error(`Ollama embedding error: ${response.statusText}`);
  }

  const data = (await response.json()) as { embedding: number[] };
  return data.embedding;
}

/**
 * Stream response (for real-time chat)
 */
export async function* streamResponse(
  prompt: string,
  model: string = "mistral:7b"
): AsyncGenerator<string> {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) throw new Error("No response body");

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split("\n").filter(Boolean);

    for (const line of lines) {
      try {
        const json = JSON.parse(line);
        if (json.response) {
          yield json.response;
        }
      } catch (e) {
        // Skip invalid JSON
      }
    }
  }
}
