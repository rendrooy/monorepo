import * as http from "node:http";

import "./config";
import app from "./app";
import { logger } from "./config/logger";

const port = Number(process.env.PORT || 3001);

const init = async (): Promise<void> => {
  const server = http.createServer(app);

  server.listen(port, "::", () => {
    logger.info({ port }, "API HTTP server started");
  });
};

init();
