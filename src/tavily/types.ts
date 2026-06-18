export type TavilyErrorCode =
  | 'CREDITS_EXHAUSTED'
  | 'RATE_LIMITED'
  | 'SEARCH_AUTH_ERROR'
  | 'SEARCH_UNAVAILABLE';

export type TavilySearchHit = {
  title: string;
  url: string;
  content: string;
};

export type TavilySearchSuccess = {
  ok: true;
  query: string;
  results: TavilySearchHit[];
};

export type TavilySearchFailure = {
  ok: false;
  code: TavilyErrorCode;
  message: string;
};

export type TavilySearchOutcome = TavilySearchSuccess | TavilySearchFailure;

export const TAVILY_ERROR_PREFIX: Record<TavilyErrorCode, string> = {
  CREDITS_EXHAUSTED: 'CREDITS_EXHAUSTED:',
  RATE_LIMITED: 'RATE_LIMITED:',
  SEARCH_AUTH_ERROR: 'SEARCH_AUTH_ERROR:',
  SEARCH_UNAVAILABLE: 'SEARCH_UNAVAILABLE:',
};
