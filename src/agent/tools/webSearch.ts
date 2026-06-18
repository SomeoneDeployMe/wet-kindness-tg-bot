import {z} from 'zod';
import {searchWeb} from '../../tavily/client';
import {TAVILY_ERROR_PREFIX} from '../../tavily/types';

export const webSearchParams = z.object({
  query: z.string().min(1).max(400),
});

export const webSearchToolDefinition = {
  name: 'web_search',
  type: 'function',
  description:
    'Search the web for current facts: news, Dota 2 pro schedules and tournaments, patch notes, rosters, standings, etc. Write queries in English. Do not use for polls or chat members.',
  parameters: webSearchParams,
};

export async function webSearch(
  args: z.infer<typeof webSearchParams>
): Promise<string> {
  try {
    const outcome = await searchWeb(args.query);

    if (!outcome.ok) {
      return `${TAVILY_ERROR_PREFIX[outcome.code]} ${outcome.message}`;
    }

    return JSON.stringify({
      query: outcome.query,
      results: outcome.results,
    });
  } catch (err) {
    console.error('web_search tool error:', err);
    return 'SEARCH_UNAVAILABLE: internal error';
  }
}
