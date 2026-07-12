export function durationInMinutes(value: string): number {
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*(minute|minutes|min)$/i);
  if (!match?.[1]) throw new Error(`Could not read duration “${value}”.`);
  return Number(match[1]);
}
