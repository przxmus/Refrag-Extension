import type { ShuffleConfig } from "../shared/config";
import type { Segment } from "../shared/types";
import { generateShuffle } from "./engine";

interface ShuffleRequest {
  config: ShuffleConfig;
  segments: Segment[];
}

interface WorkerScope {
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<ShuffleRequest>) => void,
  ): void;
  postMessage(message: { error?: string; result?: Segment[] }): void;
}

const worker = self as unknown as WorkerScope;
worker.addEventListener("message", (event) => {
  try {
    worker.postMessage({
      result: generateShuffle(event.data.segments, event.data.config),
    });
  } catch (error) {
    worker.postMessage({
      error: error instanceof Error ? error.message : "Shuffle failed.",
    });
  }
});
