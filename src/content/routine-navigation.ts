export function routineViewUrl(url: string): string | undefined {
  const parsed = new URL(url);
  const match = parsed.pathname.match(/^(\/routines\/[^/]+)\/edit\/?$/);
  if (!match?.[1]) return undefined;
  parsed.pathname = match[1];
  return parsed.toString();
}

export const isRoutineListPath = (pathname: string): boolean =>
  /^\/routines\/?$/.test(pathname);
