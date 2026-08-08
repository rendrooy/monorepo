import cors from "cors";
import express from "express";

import routes from "./routes";
import { errorMiddleware } from "./middleware/error.middleware";
import { httpLogger, requestContextMiddleware } from "./middleware/request-logger.middleware";

const app: express.Express = express();

app.use(httpLogger);
app.use(requestContextMiddleware);

app.use(express.json({ limit: "10mb" }));

app.use(
  cors({
    credentials: true,
    origin: ["http://localhost:3000"],
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
