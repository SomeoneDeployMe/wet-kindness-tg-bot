// @ts-ignore
import Az from 'az';
import {getWords} from '../utils';

export function isQuestionSentence(text: string) {
  if (text.trim().endsWith('?')) {
    const words = getWords(text);

    const questionWords = words
      .map((word: any) => Az.Morph(word))
      .filter((morphs: any) => morphs[0].tag.Ques);

    if (
      questionWords.length > 0 ||
      /(?<![а-яёa-z])(когда|будем)(?![а-яёa-z])/giu.test(text)
    ) {
      return true;
    }
  }

  return false;
}
