import { buildRuntimeApp } from "./app.js";
import { loadRuntimeConfig } from "@gmv/config";
import {
  createRuntimeContext,
  getQueueModeWarning,
  resolveQueueProcessMode
} from "./bootstrap.js";
import { startExecutiveReportScheduler } from "./report-scheduler.js";

const config = loadRuntimeConfig();
const queueMode = resolveQueueProcessMode(config, "api");
const context = await createRuntimeContext({
  config,
  queueMode
});
const app = await buildRuntimeApp(context);
const reportScheduler = startExecutiveReportScheduler(context);

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

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, async () => {
      reportScheduler.stop();
      await app.close();
      process.exit(0);
    });
  }
} catch (error) {
  reportScheduler.stop();
  app.log.error(error);
  process.exit(1);
}
