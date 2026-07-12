import { describe, expect, test } from "bun:test";
import {
  findPublishConfirmation,
  findReviewAction,
} from "../src/content/actions";

describe("findReviewAction", () => {
  test("supports routines that are published for the first time", () => {
    expect(
      findReviewAction((label) =>
        label === "Review & Publish" ? label : undefined,
      ),
    ).toBe("Review & Publish");
  });

  test("supports updates to an existing routine", () => {
    expect(
      findReviewAction((label) =>
        label === "Review & Update" ? label : undefined,
      ),
    ).toBe("Review & Update");
  });
});

describe("findPublishConfirmation", () => {
  test.each(["Publish", "Update Routine"])("supports %s", (expected) => {
    expect(
      findPublishConfirmation((label) =>
        label === expected ? label : undefined,
      ),
    ).toBe(expected);
  });
});
