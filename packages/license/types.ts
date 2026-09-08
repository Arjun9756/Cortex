export interface LicensePingPayload {
    license_key: string;
    machine_id: string;
    app_version: string;
    ip: string;
    platform: string;
}

export interface LicenseClientInfo {
    org_name: string;
    contact_name: string;
    email: string;
}

export interface LicenseSuccessResponse {
    allowed: true;
    status: string;
    client: LicenseClientInfo;
    expiry_date: string;
    expiry_date_12h?: string;
    next_ping_interval_hours?: number;
    server_time?: string;
    server_time_12h?: string;
}

export interface LicenseDeniedResponse {
    allowed: false;
    code: string;
    message: string;
}

export type LicensePingResponse = LicenseSuccessResponse | LicenseDeniedResponse;

export interface LicenseVerificationResult {
    success: boolean;
    statusCode: number;
    latencyMs: number;
    response?: LicensePingResponse;
    error?: string;
}
