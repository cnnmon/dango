export function ellipses(text: string, maxChars: number = 5): string {
  return text.length > maxChars ? `${text.substring(0, maxChars)}...` : text;
}