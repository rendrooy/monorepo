import { Router } from "express";

import testRouter from "./test";
import { createUser, deleteUser, getUser, loadUser, updateUser } from "../controller/master-user-controller";

const router = Router();

router.get("/", function (_req, res) {
  res.send("Express API is running");
});

router.use("/test", testRouter);

router.post('/user/get', getUser);
router.post('/user/load', loadUser);
router.post('/user/insert', createUser);
router.post('/user/update', updateUser);
router.post('/user/delete', deleteUser);
export default router;
