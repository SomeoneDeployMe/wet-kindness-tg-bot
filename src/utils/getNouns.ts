// @ts-ignore
import Az from 'az';

export function getNouns(words: any[]) {
  if (Array.isArray(words)) {
    return words.filter((word: any) => Az.Morph(word)[0].tag.NOUN);
  }

  return [];
}
