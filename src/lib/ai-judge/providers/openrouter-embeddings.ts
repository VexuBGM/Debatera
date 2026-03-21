/**
 * OpenRouter Embeddings Service
 *
 * Uses the OpenRouter embeddings endpoint (POST /api/v1/embeddings),
 * NOT the chat completions endpoint (/api/v1/chat/completions).
 * Embeddings transform text into high-dimensional numeric vectors
 * where semantically similar texts are positioned closer together.
 *
 * Default model: nvidia/llama-nemotron-embed-vl-1b-v2:free
 *   - Free tier (no cost per token)
 *   - 131,072 token context window
 *   - Multimodal (text + images), optimized for QA retrieval
 *   - NOTE: Free endpoint logs all prompts — do not send sensitive data
 */

const OPENROUTER_EMBEDDINGS_URL = "https://openrouter.ai/api/v1/embeddings";

const DEFAULT_MODEL =
  process.env.OPENROUTER_EMBEDDING_MODEL ??
  "nvidia/llama-nemotron-embed-vl-1b-v2:free";

// ── Types ───────────────────────────────────────────────────────────

interface EmbeddingResponseItem {
  object: "embedding";
  embedding: number[];
  index: number;
}

interface EmbeddingResponse {
  id: string;
  object: "list";
  data: EmbeddingResponseItem[];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
    cost?: number;
  };
}

interface OpenRouterErrorBody {
  error?: {
    code?: number;
    message?: string;
    metadata?: Record<string, unknown>;
  };
}

export class OpenRouterEmbeddingError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: number,
  ) {
    super(message);
    this.name = "OpenRouterEmbeddingError";
  }
}

// ── Helpers ─────────────────────────────────────────────────────────

function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new OpenRouterEmbeddingError(
      "OPENROUTER_API_KEY is not set. Add it to your .env file.",
      401,
    );
  }
  return key;
}

function buildHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    // Optional — improves ranking on openrouter.ai dashboard
    ...(process.env.NEXT_PUBLIC_BASE_URL && {
      "HTTP-Referer": process.env.NEXT_PUBLIC_BASE_URL,
    }),
    "X-OpenRouter-Title": "Debatera AI Judge",
  };
}

async function handleErrorResponse(res: Response): Promise<never> {
  let body: OpenRouterErrorBody = {};
  try {
    body = (await res.json()) as OpenRouterErrorBody;
  } catch {
    // response body wasn't JSON — fall through to generic message
  }

  const detail = body.error?.message ?? res.statusText;

  switch (res.status) {
    case 401:
      throw new OpenRouterEmbeddingError(
        `Unauthorized — check your OPENROUTER_API_KEY. ${detail}`,
        401,
        body.error?.code,
      );
    case 402:
      throw new OpenRouterEmbeddingError(
        `Payment required — your OpenRouter account has insufficient credits. ` +
          `If you are using a :free model, you may have hit the free-tier limit. ${detail}`,
        402,
        body.error?.code,
      );
    case 429:
      throw new OpenRouterEmbeddingError(
        `Rate limited — too many requests. Free models have stricter limits. ` +
          `Wait a moment and retry. ${detail}`,
        429,
        body.error?.code,
      );
    default:
      if (res.status >= 500) {
        throw new OpenRouterEmbeddingError(
          `OpenRouter server error (${res.status}). The upstream provider may be ` +
            `temporarily unavailable. ${detail}`,
          res.status,
          body.error?.code,
        );
      }
      throw new OpenRouterEmbeddingError(
        `OpenRouter request failed (${res.status}): ${detail}`,
        res.status,
        body.error?.code,
      );
  }
}

// ── Core request ────────────────────────────────────────────────────

async function requestEmbeddings(
  input: string | string[],
  model: string = DEFAULT_MODEL,
): Promise<EmbeddingResponse> {
  const apiKey = getApiKey();

  const res = await fetch(OPENROUTER_EMBEDDINGS_URL, {
    method: "POST",
    headers: buildHeaders(apiKey),
    body: JSON.stringify({ model, input }),
  });

  if (!res.ok) {
    await handleErrorResponse(res);
  }

  return (await res.json()) as EmbeddingResponse;
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Generate an embedding vector for a single text string.
 *
 * @param text  The text to embed
 * @param model Optional model override (defaults to env or free Nemotron model)
 * @returns     A numeric vector (number[])
 *
 * @example
 * ```ts
 * const vector = await embedText("What is competitive debate?");
 * console.log(vector.length); // e.g. 2048
 * ```
 */
export async function embedText(
  text: string,
  model?: string,
): Promise<number[]> {
  const response = await requestEmbeddings(text, model);

  if (!response.data[0]?.embedding) {
    throw new OpenRouterEmbeddingError(
      "Empty embedding response — the model returned no data.",
      500,
    );
  }

  return response.data[0].embedding;
}

/**
 * Generate embedding vectors for multiple texts in a single request.
 * More efficient than calling embedText() in a loop.
 *
 * @param texts Array of text strings to embed
 * @param model Optional model override
 * @returns     Array of numeric vectors, one per input text
 *
 * @example
 * ```ts
 * const vectors = await embedTexts([
 *   "Proposition argument about education",
 *   "Opposition rebuttal on funding",
 * ]);
 * console.log(vectors.length); // 2
 * ```
 */
export async function embedTexts(
  texts: string[],
  model?: string,
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const response = await requestEmbeddings(texts, model);

  // Sort by index to guarantee order matches input
  const sorted = [...response.data].sort((a, b) => a.index - b.index);
  return sorted.map((item) => item.embedding);
}

/**
 * Returns metadata about the last embedding request (model used, token usage).
 * Useful for debugging and cost tracking.
 */
export async function embedTextWithMeta(
  text: string,
  model?: string,
): Promise<{
  embedding: number[];
  model: string;
  tokensUsed: number;
}> {
  const response = await requestEmbeddings(text, model);

  return {
    embedding: response.data[0]?.embedding ?? [],
    model: response.model,
    tokensUsed: response.usage.total_tokens,
  };
}
