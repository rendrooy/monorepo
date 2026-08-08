import { Router } from "express";
import type { RequestHandler } from "express";

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
import { cancelGuestVisit, checkInGuest, checkOutGuest, createGuestVisit, loadGuestGate, loadGuestHistory, loadMyGuestVisits, updateGuestVisit } from "../controller/guest-visit-controller";
import { createTenant, getPlatformTenant, loadPlatformAudit, loadPlatformTenants, platformLogin, updatePlatformTenantStatus } from "../controller/platform-controller";
import { platformAuthMiddleware, requirePlatformPermission } from "../middleware/platform-auth.middleware";
import {
  approveTenantPlanChange, approveTenantSubscriptionPayment, createTenantSubscriptionPayment,
  getPlatformPlans, getPlatformSubscriptionPaymentProof, getTenantBillingSummary, getTenantSubscriptionPaymentProof, getTenantPlatformPlans,
  loadPlatformPaymentReviews, loadPlatformSubscriptions, loadTenantInvoices, reconcilePlatformSubscriptions,
  rejectTenantSubscriptionPayment, requestTenantPlanChange, updatePlatformPlan,
} from "../controller/platform-billing-controller";
import { requireTenantFeature } from "../middleware/tenant-entitlement.middleware";
import { requireTenantPermission } from "../middleware/tenant-permission.middleware";
import { TENANT_FEATURE } from "../services/tenant-entitlement-service";
import { PERMISSION } from "../utils/rbac";
import { liveHealth, platformOperationsSummary, readyHealth } from "../controller/health-controller";
import { authRateLimit, tenantApiRateLimit } from "../middleware/rate-limit.middleware";
import {
  createPlatformMenu, createPlatformRole, deletePlatformMenu, deletePlatformRole,
  getPlatformMenu, getPlatformRole, loadPlatformMenus, loadPlatformRoles,
  updatePlatformMenu, updatePlatformRole,
} from "../controller/platform-access-controller";

const router = Router();

router.get("/", function (_req, res) {
  res.send("Express API is running");
});

router.use("/test", testRouter);

router.get('/health/live', liveHealth);
router.get('/health/ready', readyHealth);

router.post('/platform/auth/login', authRateLimit, platformLogin);
router.post('/platform/tenant', platformAuthMiddleware, requirePlatformPermission('TENANT_CREATE'), createTenant);
router.post('/platform/tenant/load', platformAuthMiddleware, requirePlatformPermission('TENANT_READ'), loadPlatformTenants);
router.post('/platform/tenant/get', platformAuthMiddleware, requirePlatformPermission('TENANT_READ'), getPlatformTenant);
router.post('/platform/tenant/status', platformAuthMiddleware, requirePlatformPermission('TENANT_STATUS_UPDATE'), updatePlatformTenantStatus);
router.post('/platform/audit/load', platformAuthMiddleware, requirePlatformPermission('PLATFORM_AUDIT_READ'), loadPlatformAudit);
router.post('/platform/operations/summary', platformAuthMiddleware, requirePlatformPermission('PLATFORM_AUDIT_READ'), platformOperationsSummary);
router.post('/platform/subscription/plan', platformAuthMiddleware, requirePlatformPermission('PLATFORM_BILLING_READ'), getPlatformPlans);
router.post('/platform/subscription/plan/update', platformAuthMiddleware, requirePlatformPermission('PLATFORM_PLAN_MANAGE'), updatePlatformPlan);
router.post('/platform/subscription/payment/load', platformAuthMiddleware, requirePlatformPermission('PLATFORM_BILLING_READ'), loadPlatformPaymentReviews);
router.post('/platform/subscription/load', platformAuthMiddleware, requirePlatformPermission('PLATFORM_BILLING_READ'), loadPlatformSubscriptions);
router.post('/platform/subscription/payment/approve', platformAuthMiddleware, requirePlatformPermission('PLATFORM_PAYMENT_REVIEW'), approveTenantSubscriptionPayment);
router.post('/platform/subscription/payment/reject', platformAuthMiddleware, requirePlatformPermission('PLATFORM_PAYMENT_REVIEW'), rejectTenantSubscriptionPayment);
router.get('/platform/subscription/payment/:id/proof', platformAuthMiddleware, requirePlatformPermission('PLATFORM_BILLING_READ'), getPlatformSubscriptionPaymentProof);
router.post('/platform/subscription/change/approve', platformAuthMiddleware, requirePlatformPermission('PLATFORM_SUBSCRIPTION_MANAGE'), approveTenantPlanChange);
router.post('/platform/subscription/reconcile', platformAuthMiddleware, requirePlatformPermission('PLATFORM_SUBSCRIPTION_MANAGE'), reconcilePlatformSubscriptions);
router.post('/platform/access/role/load', platformAuthMiddleware, requirePlatformPermission('TENANT_ROLE_READ'), loadPlatformRoles);
router.post('/platform/access/role/get', platformAuthMiddleware, requirePlatformPermission('TENANT_ROLE_READ'), getPlatformRole);
router.post('/platform/access/role/create', platformAuthMiddleware, requirePlatformPermission('TENANT_ROLE_MANAGE'), createPlatformRole);
router.post('/platform/access/role/update', platformAuthMiddleware, requirePlatformPermission('TENANT_ROLE_MANAGE'), updatePlatformRole);
router.post('/platform/access/role/delete', platformAuthMiddleware, requirePlatformPermission('TENANT_ROLE_MANAGE'), deletePlatformRole);
router.post('/platform/access/menu/load', platformAuthMiddleware, requirePlatformPermission('TENANT_MENU_READ'), loadPlatformMenus);
router.post('/platform/access/menu/get', platformAuthMiddleware, requirePlatformPermission('TENANT_MENU_READ'), getPlatformMenu);
router.post('/platform/access/menu/create', platformAuthMiddleware, requirePlatformPermission('TENANT_MENU_MANAGE'), createPlatformMenu);
router.post('/platform/access/menu/update', platformAuthMiddleware, requirePlatformPermission('TENANT_MENU_MANAGE'), updatePlatformMenu);
router.post('/platform/access/menu/delete', platformAuthMiddleware, requirePlatformPermission('TENANT_MENU_MANAGE'), deletePlatformMenu);

router.post('/auth/login', authRateLimit, login);
router.post('/auth/register', authRateLimit, register);
router.post('/auth/me', authMiddleware, me);
router.post('/auth/menu', authMiddleware, authMenu);

router.use(authMiddleware);
router.use(tenantApiRateLimit);

router.post('/platform-billing/summary', requireTenantPermission('PLATFORM_BILLING', PERMISSION.READ), getTenantBillingSummary);
router.post('/platform-billing/plan/load', requireTenantPermission('PLATFORM_BILLING', PERMISSION.READ), getTenantPlatformPlans);
router.post('/platform-billing/invoice/load', requireTenantPermission('PLATFORM_BILLING', PERMISSION.READ), loadTenantInvoices);
router.post('/platform-billing/plan/change', requireTenantPermission('PLATFORM_BILLING', PERMISSION.ACTION), requestTenantPlanChange);
router.post('/platform-billing/payment/create', requireTenantPermission('PLATFORM_BILLING', PERMISSION.ADD), createTenantSubscriptionPayment);
router.get('/platform-billing/payment/:id/proof', requireTenantPermission('PLATFORM_BILLING', PERMISSION.READ), getTenantSubscriptionPaymentProof);

router.post('/master/user/get', requireTenantFeature(TENANT_FEATURE.RESIDENT_DATABASE), getUser);
router.post('/master/user/load', requireTenantFeature(TENANT_FEATURE.RESIDENT_DATABASE), loadUser);
router.post('/master/user/insert', requireTenantFeature(TENANT_FEATURE.RESIDENT_DATABASE), createUser);
router.post('/master/user/update', requireTenantFeature(TENANT_FEATURE.RESIDENT_DATABASE), updateUser);
router.post('/master/user/delete', requireTenantFeature(TENANT_FEATURE.RESIDENT_DATABASE), deleteUser);

const tenantRbacManagedByPlatform: RequestHandler = (_req, res) =>
  res.status(403).json({ data: null, message: "Role dan menu dikelola oleh Super Admin platform", status: 403 });
router.post('/master/role/get', tenantRbacManagedByPlatform);
router.post('/master/role/load', tenantRbacManagedByPlatform);
router.post('/master/role/insert', tenantRbacManagedByPlatform);
router.post('/master/role/update', tenantRbacManagedByPlatform);
router.post('/master/role/delete', tenantRbacManagedByPlatform);
router.post('/master/menu/get', tenantRbacManagedByPlatform);
router.post('/master/menu/load', tenantRbacManagedByPlatform);
router.post('/master/menu/insert', tenantRbacManagedByPlatform);
router.post('/master/menu/update', tenantRbacManagedByPlatform);
router.post('/master/menu/delete', tenantRbacManagedByPlatform);

router.post('/master/member/get', requireTenantFeature(TENANT_FEATURE.RESIDENT_DATABASE), getMember);
router.post('/master/member/load', requireTenantFeature(TENANT_FEATURE.RESIDENT_DATABASE), loadMember);
router.post('/master/member/insert', requireTenantFeature(TENANT_FEATURE.RESIDENT_DATABASE), createMember);
router.post('/master/member/update', requireTenantFeature(TENANT_FEATURE.RESIDENT_DATABASE), updateMember);
router.post('/master/member/delete', requireTenantFeature(TENANT_FEATURE.RESIDENT_DATABASE), deleteMember);

router.post('/master/family/get', requireTenantFeature(TENANT_FEATURE.RESIDENT_DATABASE), getFamily);
router.post('/master/family/load', requireTenantFeature(TENANT_FEATURE.RESIDENT_DATABASE), loadFamily);
router.post('/master/family/insert', requireTenantFeature(TENANT_FEATURE.RESIDENT_DATABASE), createFamily);
router.post('/master/family/update', requireTenantFeature(TENANT_FEATURE.RESIDENT_DATABASE), updateFamily);
router.post('/master/family/delete', requireTenantFeature(TENANT_FEATURE.RESIDENT_DATABASE), deleteFamily);

router.use('/operation/user-registration', requireTenantFeature(TENANT_FEATURE.RESIDENT_DATABASE));
router.post('/operation/user-registration/load', loadUserRegistration);
router.post('/operation/user-registration/get', getUserRegistration);
router.post('/operation/user-registration/approve', approveUserRegistration);
router.post('/operation/user-registration/reject', rejectUserRegistration);

router.use('/operation/ipl', requireTenantFeature(TENANT_FEATURE.IPL));
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
router.post('/operation/ipl/report/summary', requireTenantFeature(TENANT_FEATURE.FINANCIAL_REPORT), getIplReportSummary);
router.post('/operation/ipl/credit/load', requireTenantFeature(TENANT_FEATURE.FINANCIAL_REPORT), loadIplCreditLedger);
router.post('/operation/ipl/dashboard', requireTenantFeature(TENANT_FEATURE.FINANCIAL_REPORT), getIplDashboard);
router.post('/operation/ipl/dashboard/trend', requireTenantFeature(TENANT_FEATURE.FINANCIAL_REPORT), getIplFinancialTrend);
router.use('/operation/umkm', requireTenantFeature(TENANT_FEATURE.UMKM_ADS));
router.use('/umkm', requireTenantFeature(TENANT_FEATURE.UMKM_ADS));
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
router.use('/operation/guest', requireTenantFeature(TENANT_FEATURE.GUEST_SECURITY));
router.use('/security/guest', requireTenantFeature(TENANT_FEATURE.GUEST_SECURITY));
router.post('/operation/guest/load', loadMyGuestVisits);
router.post('/operation/guest/insert', createGuestVisit);
router.post('/operation/guest/update', updateGuestVisit);
router.post('/operation/guest/cancel', cancelGuestVisit);
router.post('/security/guest/load', loadGuestGate);
router.post('/security/guest/history', loadGuestHistory);
router.post('/security/guest/check-in', checkInGuest);
router.post('/security/guest/check-out', checkOutGuest);
router.post('/notification/load', requireTenantFeature(TENANT_FEATURE.RESIDENT_DATABASE), loadNotification);
router.post('/notification/read', requireTenantFeature(TENANT_FEATURE.RESIDENT_DATABASE), readNotification);

router.post('/utils/role', requireTenantFeature(TENANT_FEATURE.RESIDENT_DATABASE), getDropdownRole);
router.post('/utils/member', requireTenantFeature(TENANT_FEATURE.RESIDENT_DATABASE), getDropdownMember);
router.post('/utils/user', requireTenantFeature(TENANT_FEATURE.RESIDENT_DATABASE), getDropdownUser);
router.post('/utils/family', requireTenantFeature(TENANT_FEATURE.RESIDENT_DATABASE), getDropdownFamily);
router.post('/utils/family-relation', requireTenantFeature(TENANT_FEATURE.RESIDENT_DATABASE), getDropdownFamilyRelation);


export default router;
