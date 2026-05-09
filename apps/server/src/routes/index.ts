import { Router } from "express";

import testRouter from "./test";
import { getUser } from "../controller/master-user-controller";

const router = Router();

router.get("/", function (_req, res) {
  res.send("Express API is running");
});

router.use("/test", testRouter);

router.post('/user/get', getUser);
export default router;
