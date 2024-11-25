// @ts-ignore
import Az from 'az';
import {capitalize} from './utils';

Az.Morph.init(() => {});

export function swearBack(text: string): string | false {
  const nouns = getNouns(getWords(text));

  if (nouns.length > 0) {
    const noun = nouns[0];

    const parser = Az.Morph(noun)[0];
    const word = parser.normalize(true).inflect('', ['sing', 'accs']).word;

    if (word) {
      return capitalize(word);
    }
  }

  return false;
}

function getWords(text: string) {
  if (text && text.length > 0) {
    const tokens: any = Az.Tokens(text).done([Az.Tokens.WORD]);

    if (tokens.length > 0) {
      const cyrillicWords = tokens.filter(
        (token: any) => token.subType === Az.Tokens.CYRIL
      );

      if (cyrillicWords.length > 0) {
        return cyrillicWords.map((word: any) =>
          word.source.substring(word.st, word.st + word.length).toLowerCase()
        );
      }
    }
  }

  return [];
}

function getNouns(words: any[]) {
  if (Array.isArray(words)) {
    return words.filter((word: any) => Az.Morph(word)[0].tag.NOUN);
  }

  return [];
}
