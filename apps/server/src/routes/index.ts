import { Router } from "express";

import testRouter from "./test";
import { createUser, deleteUser, getUser, loadUser, updateUser } from "../controller/master-user-controller";
import { createRole, deleteRole, getRole, loadRole, updateRole } from "../controller/master-role-controller";
import { getDropdownRole, getDropdownMember, getDropdownUser } from "../controller/utitlities-controller";
import {
  createMember,
  deleteMember,
  getMember,
  loadMember,
  updateMember
} from "../controller/master-member-controller";

const router = Router();

router.get("/", function (_req, res) {
  res.send("Express API is running");
});

router.use("/test", testRouter);

router.post('/master/user/get', getUser);
router.post('/master/user/load', loadUser);
router.post('/master/user/insert', createUser);
router.post('/master/user/update', updateUser);
router.post('/master/user/delete', deleteUser);

router.post('/master/role/get', getRole);
router.post('/master/role/load', loadRole);
router.post('/master/role/insert', createRole);
router.post('/master/role/update', updateRole);
router.post('/master/role/delete', deleteRole);

router.post('/master/member/get', getMember);
router.post('/master/member/load', loadMember);
router.post('/master/member/insert', createMember);
router.post('/master/member/update', updateMember);
router.post('/master/member/delete', deleteMember);

router.post('/utils/role', getDropdownRole);
router.post('/utils/member', getDropdownMember);
router.post('/utils/user', getDropdownUser);


export default router;
