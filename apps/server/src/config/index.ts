import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const loadLocalEnv = (): void => {
    const envPathCandidates = [
        resolve(process.cwd(), ".env"),
        resolve(process.cwd(), "apps/server/.env"),
        resolve(__dirname, "../../.env"),
    ];
    const envPath = envPathCandidates.find((candidate) => existsSync(candidate));

    if (!envPath) {
        return;
    }

    const lines = readFileSync(envPath, "utf8").split(/\r?\n/);

    for (const line of lines) {
        const trimmedLine = line.trim();

        if (!trimmedLine || trimmedLine.startsWith("#")) {
            continue;
        }

        const separatorIndex = trimmedLine.indexOf("=");

        if (separatorIndex === -1) {
            continue;
        }

        const key = trimmedLine.slice(0, separatorIndex).trim();
        let value = trimmedLine.slice(separatorIndex + 1).trim();

        if (!key || process.env[key] !== undefined) {
            continue;
        }

        if (
            (value.startsWith("\"") && value.endsWith("\"")) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }

        process.env[key] = value;
    }
};

loadLocalEnv();

export const timeConfig = {
    momentDate: 'YYYY-MM-DD',
    oracleDate: 'YYYY-MM-DD',
    clock: 'HH:mm:ss',
    moment: 'YYYY-MM-DD HH:mm:ss',
    oracle: 'YYYY-MM-DD HH24:MI:SS',
};

export const dbConnection = {
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:NxI8S0CQv8k4gZLn@db.erxkctaqtmqpxlgjznkj.supabase.co:5432/postgres",
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'db.erxkctaqtmqpxlgjznkj.supabase.co',
    database: process.env.DB_NAME || 'postgres',
    password: process.env.DB_PASSWORD || 'NxI8S0CQv8k4gZLn',
    port: Number(process.env.DB_PORT || 5432), // Port default PostgreSQL
};

export const tableNames = {
    masterUser: "m_user",
    masterRole: "m_role",
    masterMenu: "m_menu",
    masterRoleMenuPermission: "m_role_menu_permission",
    masterMember: "m_member",
    masterFamily: "m_family",
    iplBillBatch: "t_ipl_bill_batch",
    iplBill: "t_ipl_bill",
    notification: "t_notification",
    iplPayment: "t_ipl_payment",
    iplFamilyCredit: "t_ipl_family_credit",
    iplCreditLedger: "t_ipl_credit_ledger",
};

export const locales = {
    request_success: "Request successful",
    resource_not_found: "Resource not found",
    resource_already_exists: "Resource already exists",
    unable_to_handle_request: "Unable to handle request",
    email_already_registered: "Email or phone is already registered",
    invalid_login: "Invalid account or password",
    invalid_password: "Invalid password",
    account_not_registered: "Email or phone is not registered yet",
    invalid_access_token: "Invalid access token",
    invalid_otp_code: "Invalid OTP code",
    invalid_verification_token: "Invalid verification token",
    failed_to_create_subscription: "Failed to create subscription",
    failed_to_cancel_subscription: "Failed to cancel subscription",
    invalid_recaptcha: "Invalid recaptcha",
    logout_success: "logout success",
    member_not_registered: "Member not registered",
    already_attendance: "Attendace already recorded",
    out_of_range: "Out of range",
    delete_success: "Delete Success",
};
