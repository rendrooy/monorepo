import cors from "cors";
import express from "express";
import morgan from "morgan";

import routes from "./routes";
import { errorMiddleware } from "./middleware/error.middleware";

const app: express.Express = express();

app.use(morgan("tiny"));

app.use(express.json({ limit: "100mb" }));

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
