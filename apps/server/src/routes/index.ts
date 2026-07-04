import { Router } from "express";

import testRouter from "./test";
import { authMenu, login, me } from "../controller/auth-controller";
import { createUser, deleteUser, getUser, loadUser, updateUser } from "../controller/master-user-controller";
import { createRole, deleteRole, getRole, loadRole, updateRole } from "../controller/master-role-controller";
import { createMenu, deleteMenu, getMenu, loadMenu, updateMenu } from "../controller/master-menu-controller";
import { getDropdownFamily, getDropdownFamilyRelation, getDropdownIplBill, getDropdownRole, getDropdownMember, getDropdownUser } from "../controller/utitlities-controller";
import {
  createMember,
  deleteMember,
  getMember,
  loadMember,
  updateMember
} from "../controller/master-member-controller";
import {
  createExpense,
  createFamily,
  createIplPayment,
  createIplSetting,
  deleteExpense,
  deleteFamily,
  deleteIplBill,
  deleteIplPayment,
  deleteIplSetting,
  generateIplBill,
  getCashReport,
  getFamily,
  getIplBill,
  getIplDashboard,
  getIplPayment,
  getIplSetting,
  loadExpense,
  loadFamily,
  loadIplBill,
  loadIplPayment,
  loadIplSetting,
  updateFamily,
  updateIplBill,
  updateIplPayment,
  updateIplSetting
} from "../controller/homehub-ipl-controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/", function (_req, res) {
  res.send("Express API is running");
});

router.use("/test", testRouter);

router.post('/auth/login', login);
router.post('/auth/me', authMiddleware, me);
router.post('/auth/menu', authMiddleware, authMenu);

router.use(authMiddleware);

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

router.post('/master/menu/get', getMenu);
router.post('/master/menu/load', loadMenu);
router.post('/master/menu/insert', createMenu);
router.post('/master/menu/update', updateMenu);
router.post('/master/menu/delete', deleteMenu);

router.post('/master/member/get', getMember);
router.post('/master/member/load', loadMember);
router.post('/master/member/insert', createMember);
router.post('/master/member/update', updateMember);
router.post('/master/member/delete', deleteMember);

router.post('/master/family/get', getFamily);
router.post('/master/family/load', loadFamily);
router.post('/master/family/insert', createFamily);
router.post('/master/family/update', updateFamily);
router.post('/master/family/delete', deleteFamily);

router.post('/ipl/setting/get', getIplSetting);
router.post('/ipl/setting/load', loadIplSetting);
router.post('/ipl/setting/insert', createIplSetting);
router.post('/ipl/setting/update', updateIplSetting);
router.post('/ipl/setting/delete', deleteIplSetting);

router.post('/ipl/bill/get', getIplBill);
router.post('/ipl/bill/load', loadIplBill);
router.post('/ipl/bill/generate', generateIplBill);
router.post('/ipl/bill/update', updateIplBill);
router.post('/ipl/bill/delete', deleteIplBill);

router.post('/ipl/payment/get', getIplPayment);
router.post('/ipl/payment/load', loadIplPayment);
router.post('/ipl/payment/insert', createIplPayment);
router.post('/ipl/payment/update', updateIplPayment);
router.post('/ipl/payment/delete', deleteIplPayment);

router.post('/ipl/dashboard', getIplDashboard);
router.post('/ipl/cash-report', getCashReport);
router.post('/ipl/expense/load', loadExpense);
router.post('/ipl/expense/insert', createExpense);
router.post('/ipl/expense/delete', deleteExpense);

router.post('/utils/role', getDropdownRole);
router.post('/utils/member', getDropdownMember);
router.post('/utils/user', getDropdownUser);
router.post('/utils/family', getDropdownFamily);
router.post('/utils/ipl-bill', getDropdownIplBill);
router.post('/utils/family-relation', getDropdownFamilyRelation);


export default router;
