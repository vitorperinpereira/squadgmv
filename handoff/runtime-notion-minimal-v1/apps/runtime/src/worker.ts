import { loadRuntimeConfig } from "@gmv/config";
import {
  createRuntimeContext,
  getQueueModeWarning,
  resolveQueueProcessMode
} from "./bootstrap.js";

const config = loadRuntimeConfig();
const context = await createRuntimeContext({
  config,
  queueMode: resolveQueueProcessMode(config, "worker")
});

const queueModeWarning = getQueueModeWarning(config, "worker");

if (queueModeWarning) {
  context.logger.warn(
    {
      queueDriver: config.QUEUE_DRIVER,
      stateDriver: config.STATE_DRIVER,
      queueMode: resolveQueueProcessMode(config, "worker")
    },
    queueModeWarning
  );
}

context.logger.info(
  {
    queueDriver: context.queue.driverName,
    notionEnabled: context.planningAdapter.getStatus().enabled
  },
  "GMV worker runtime online."
);

const keepAlive = setInterval(() => {
  context.logger.debug("Worker heartbeat");
}, 30_000);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    clearInterval(keepAlive);
    await context.close();
    process.exit(0);
  });
}
