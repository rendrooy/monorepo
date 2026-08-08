import cors from "cors";
import express from "express";

import routes from "./routes";
import { runtimeConfig } from "./config";
import { errorMiddleware } from "./middleware/error.middleware";
import { apiRateLimit } from "./middleware/rate-limit.middleware";
import { httpLogger, requestContextMiddleware } from "./middleware/request-logger.middleware";
import { securityHeaders } from "./middleware/security.middleware";

const app: express.Express = express();

app.disable("x-powered-by");
if (runtimeConfig.trustProxy) app.set("trust proxy", 1);

app.use(httpLogger);
app.use(requestContextMiddleware);
app.use(securityHeaders);
app.use(apiRateLimit);

app.use(express.json({ limit: "10mb" }));

app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || runtimeConfig.corsOrigins.includes(origin)) callback(null, true);
      else callback(new Error("Origin tidak diizinkan"));
    },
  })
);
app.use("/v1", routes);

app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({
    message: "Route not found"
  });
});

// ❗ WAJIB paling terakhir
app.use(errorMiddleware);
export default app;
