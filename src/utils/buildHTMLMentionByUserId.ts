export function buildHTMLMentionByUserId(userId: number, userName: string) {
  return `<a href="tg://user?id=${userId}">${userName}</a>`;
}
