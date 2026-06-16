// @ts-ignore
import Az from 'az';

export function getWords(text: string) {
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
