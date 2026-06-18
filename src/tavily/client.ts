import {tavily} from '@tavily/core';
import {
  TavilyErrorCode,
  TavilySearchOutcome,
} from './types';

const SEARCH_TIMEOUT_SECONDS = 10;
const MAX_CONTENT_LENGTH = 500;

let client: ReturnType<typeof tavily> | null = null;

function getClient() {
  if (!client) {
    client = tavily({apiKey: process.env.TAVILY_API_KEY!});
  }

  return client;
}

function truncate(text: string): string {
  if (text.length <= MAX_CONTENT_LENGTH) {
    return text;
  }

  return `${text.slice(0, MAX_CONTENT_LENGTH)}…`;
}

function parseError(err: unknown): {status?: number; message: string} {
  if (err instanceof Error) {
    const match = err.message.match(/^(\d{3}) Error:/);

    if (match) {
      return {status: Number(match[1]), message: err.message};
    }

    return {message: err.message};
  }

  return {message: String(err)};
}

function isCreditsExhausted(status: number, message: string): boolean {
  if (status !== 429) {
    return false;
  }

  const lower = message.toLowerCase();

  return (
    lower.includes('credit') ||
    lower.includes('quota') ||
    lower.includes('usage')
  );
}

function classifyError(
  status: number | undefined,
  message: string
): TavilyErrorCode {
  if (status === 429) {
    return isCreditsExhausted(status, message)
      ? 'CREDITS_EXHAUSTED'
      : 'RATE_LIMITED';
  }

  if (status === 401 || status === 403) {
    return 'SEARCH_AUTH_ERROR';
  }

  return 'SEARCH_UNAVAILABLE';
}

export async function searchWeb(query: string): Promise<TavilySearchOutcome> {
  try {
    const response = await getClient().search(query, {
      searchDepth: 'basic',
      maxResults: 5,
      autoParameters: false,
      timeout: SEARCH_TIMEOUT_SECONDS,
    });

    return {
      ok: true,
      query: response.query,
      results: response.results.map((result) => ({
        title: result.title,
        url: result.url,
        content: truncate(result.content),
      })),
    };
  } catch (err) {
    const {status, message} = parseError(err);
    const code = classifyError(status, message);

    if (code === 'SEARCH_AUTH_ERROR') {
      console.error('Tavily auth error:', status, message);
    } else {
      console.warn('Tavily search failed:', status ?? 'unknown', message);
    }

    return {ok: false, code, message};
  }
}
