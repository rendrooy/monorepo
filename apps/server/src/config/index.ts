export const timeConfig = {
    momentDate: 'YYYY-MM-DD',
    oracleDate: 'YYYY-MM-DD',
    clock: 'HH:mm:ss',
    moment: 'YYYY-MM-DD HH:mm:ss',
    oracle: 'YYYY-MM-DD HH24:MI:SS',
};

export const dbConnection = {
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: 'postgres',
    port: 5432, // Port default PostgreSQL
};

export const tableNames = {
    masterUser: "homehub_revamp.m_user",
    masterRole: "homehub_revamp.m_role",
    masterMenu: "homehub_revamp.m_menu",
    masterRoleMenuPermission: "homehub_revamp.m_role_menu_permission",
    masterMember: "homehub_revamp.m_member",
    masterFamily: "homehub_revamp.m_family",
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
