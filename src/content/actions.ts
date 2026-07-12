export const REVIEW_ACTION_LABELS = [
  "Review & Publish",
  "Review & Update",
] as const;

export const PUBLISH_CONFIRMATION_LABELS = [
  "Publish",
  "Publish Routine",
  "Update Routine",
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

export function findPublishConfirmation<T>(
  findAction: (label: string) => T | undefined,
): T | undefined {
  for (const label of PUBLISH_CONFIRMATION_LABELS) {
    const action = findAction(label);
    if (action) return action;
  }
  return undefined;
}
