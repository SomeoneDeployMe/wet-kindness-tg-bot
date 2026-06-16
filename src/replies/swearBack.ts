// @ts-ignore
import Az from 'az';
import {capitalize, getNouns, getWords} from '../utils';

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
