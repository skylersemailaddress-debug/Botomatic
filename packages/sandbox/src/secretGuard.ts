const SECRET_PATTERNS = [/api[_-]?key/i, /secret/i, /token/i, /password/i];

export function detectSecretLikeContent(text: string): boolean {
  return SECRET_PATTERNS.some((pattern) => pattern.test(text));
}
