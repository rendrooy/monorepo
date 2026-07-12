import { Router } from "express";

import testRouter from "./test";
import { authMenu, login, me, register } from "../controller/auth-controller";
import {
  approveUserRegistration,
  createUser,
  deleteUser,
  getUser,
  getUserRegistration,
  loadUser,
  loadUserRegistration,
  rejectUserRegistration,
  updateUser
} from "../controller/master-user-controller";
import { createRole, deleteRole, getRole, loadRole, updateRole } from "../controller/master-role-controller";
import { createMenu, deleteMenu, getMenu, loadMenu, updateMenu } from "../controller/master-menu-controller";
import { getDropdownFamily, getDropdownFamilyRelation, getDropdownRole, getDropdownMember, getDropdownUser } from "../controller/utitlities-controller";
import {
  createMember,
  deleteMember,
  getMember,
  loadMember,
  updateMember
} from "../controller/master-member-controller";
import {
  createFamily,
  deleteFamily,
  getFamily,
  loadFamily,
  updateFamily,
} from "../controller/master-family-controller";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  cancelBillBatch, createBillBatch, getBillBatch, loadBill, loadBillBatch,
  loadMyBill, loadNotification, publishBillBatch, readNotification, updateBillBatch,
} from "../controller/ipl-billing-controller";
import {
  approvePayment, createPayment, getPaymentProof, loadMyPayment,
  loadPayment, rejectPayment, reversePayment,
} from "../controller/ipl-payment-controller";
import { getIplReportSummary, loadIplCreditLedger } from "../controller/ipl-report-controller";
import { getIplDashboard, getIplFinancialTrend } from "../controller/ipl-dashboard-controller";
import { approveUmkm, getUmkmCategories, getUmkmImage, loadMyUmkm, loadUmkmReview, rejectUmkm, resumeUmkm, saveUmkmDraft, submitUmkm, suspendUmkm } from "../controller/umkm-controller";
import { approveSubscriptionPayment, createSubscription, getActivePlans, getActiveUmkmAds, getMySubscriptions, getPaymentReviews, getPlans, getUmkmPaymentProof, paySubscription, rejectSubscriptionPayment, releaseUmkmSubscription, upsertPlan } from "../controller/umkm-subscription-controller";

const router = Router();

router.get("/", function (_req, res) {
  res.send("Express API is running");
});

router.use("/test", testRouter);

router.post('/auth/login', login);
router.post('/auth/register', register);
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

router.post('/operation/user-registration/load', loadUserRegistration);
router.post('/operation/user-registration/get', getUserRegistration);
router.post('/operation/user-registration/approve', approveUserRegistration);
router.post('/operation/user-registration/reject', rejectUserRegistration);

router.post('/operation/ipl/batch/load', loadBillBatch);
router.post('/operation/ipl/batch/get', getBillBatch);
router.post('/operation/ipl/batch/insert', createBillBatch);
router.post('/operation/ipl/batch/update', updateBillBatch);
router.post('/operation/ipl/batch/publish', publishBillBatch);
router.post('/operation/ipl/batch/cancel', cancelBillBatch);
router.post('/operation/ipl/bill/load', loadBill);
router.post('/operation/ipl/bill/my', loadMyBill);
router.post('/operation/ipl/payment/load', loadPayment);
router.post('/operation/ipl/payment/my', loadMyPayment);
router.post('/operation/ipl/payment/create', createPayment);
router.post('/operation/ipl/payment/approve', approvePayment);
router.post('/operation/ipl/payment/reject', rejectPayment);
router.post('/operation/ipl/payment/reverse', reversePayment);
router.get('/operation/ipl/payment/:id/proof', getPaymentProof);
router.post('/operation/ipl/report/summary', getIplReportSummary);
router.post('/operation/ipl/credit/load', loadIplCreditLedger);
router.post('/operation/ipl/dashboard', getIplDashboard);
router.post('/operation/ipl/dashboard/trend', getIplFinancialTrend);
router.post('/operation/umkm/categories', getUmkmCategories);
router.post('/operation/umkm/my/load', loadMyUmkm);
router.post('/operation/umkm/save', saveUmkmDraft);
router.post('/operation/umkm/submit', submitUmkm);
router.post('/operation/umkm/suspend', suspendUmkm);
router.post('/operation/umkm/resume', resumeUmkm);
router.post('/umkm/content/load', loadUmkmReview);
router.post('/umkm/content/approve', approveUmkm);
router.post('/umkm/content/reject', rejectUmkm);
router.get('/umkm/revision/:id/image', getUmkmImage);
router.post('/operation/umkm/subscription/plans', getActivePlans);
router.post('/operation/umkm/ads', getActiveUmkmAds);
router.post('/operation/umkm/subscription/my', getMySubscriptions);
router.post('/operation/umkm/subscription/create', createSubscription);
router.post('/operation/umkm/subscription/pay', paySubscription);
router.post('/operation/umkm/subscription/release', releaseUmkmSubscription);
router.post('/umkm/subscription/plan/load', getPlans);
router.post('/umkm/subscription/plan/save', upsertPlan);
router.post('/umkm/subscription/payment/load', getPaymentReviews);
router.post('/umkm/subscription/payment/approve', approveSubscriptionPayment);
router.post('/umkm/subscription/payment/reject', rejectSubscriptionPayment);
router.get('/umkm/subscription/payment/:id/proof', getUmkmPaymentProof);
router.post('/notification/load', loadNotification);
router.post('/notification/read', readNotification);

router.post('/utils/role', getDropdownRole);
router.post('/utils/member', getDropdownMember);
router.post('/utils/user', getDropdownUser);
router.post('/utils/family', getDropdownFamily);
router.post('/utils/family-relation', getDropdownFamilyRelation);


export default router;
