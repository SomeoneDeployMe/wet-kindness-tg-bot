import '../loadEnv';
import OpenAI from 'openai';

export const openai = new OpenAI({
  baseURL: process.env.OPENAI_URL,
  apiKey: process.env.OPENAI_API_KEY,
});
