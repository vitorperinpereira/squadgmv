import { buildRuntimeApp } from "./app.js";
import { loadRuntimeConfig } from "@gmv/config";
import {
  createRuntimeContext,
  getQueueModeWarning,
  resolveQueueProcessMode
} from "./bootstrap.js";

const config = loadRuntimeConfig();
const queueMode = resolveQueueProcessMode(config, "api");
const app = await buildRuntimeApp(
  await createRuntimeContext({
    config,
    queueMode
  })
);

try {
  const queueModeWarning = getQueueModeWarning(config, "api");

  if (queueModeWarning) {
    app.log.warn(
      {
        queueDriver: config.QUEUE_DRIVER,
        stateDriver: config.STATE_DRIVER,
        queueMode
      },
      queueModeWarning
    );
  }

  const port = Number(process.env.PORT ?? 3001);
  await app.listen({
    host: "0.0.0.0",
    port
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
