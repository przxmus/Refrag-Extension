export const REVIEW_ACTION_LABELS = [
  "Review & Publish",
  "Review & Update",
] as const;

export function findReviewAction<T>(
  findAction: (label: string) => T | undefined,
): T | undefined {
  for (const label of REVIEW_ACTION_LABELS) {
    const action = findAction(label);
    if (action) return action;
  }
  return undefined;
}
