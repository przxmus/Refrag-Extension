import type { ShuffleConfig } from "../shared/config";
import type { Segment } from "../shared/types";
import { generateShufflePlan, type ShuffleProgress } from "./engine";

interface ShuffleRequest {
  config: ShuffleConfig;
  segments: Segment[];
}

interface WorkerScope {
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<ShuffleRequest>) => void,
  ): void;
  postMessage(
    message:
      | { error: string }
      | { progress: ShuffleProgress }
      | { result: Segment[]; relaxedConstraints: string[] },
  ): void;
}

const worker = self as unknown as WorkerScope;
worker.addEventListener("message", (event) => {
  try {
    const plan = generateShufflePlan(
      event.data.segments,
      event.data.config,
      Math.random,
      (progress) => worker.postMessage({ progress }),
    );
    worker.postMessage({ ...plan, result: plan.segments });
  } catch (error) {
    worker.postMessage({
      error: error instanceof Error ? error.message : "Shuffle failed.",
    });
  }
});
