import type { BaseResponse } from "@monorepo/types";

import { clearPlatformSession, getPlatformToken } from "@/utils/platform-auth-storage";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/v1";

export const platformApi = async <T>(path: string, body: unknown = {}): Promise<BaseResponse<T>> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(getPlatformToken() ? { Authorization: `Bearer ${getPlatformToken()}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({ data: null, message: "Response API tidak valid", status: response.status }));
  if (response.status === 401) clearPlatformSession();
  if (!response.ok) throw Object.assign(new Error(result.message || "Request gagal"), { response: result });
  return result as BaseResponse<T>;
};

export const platformProofUrl = (paymentId: string) => `${API_BASE_URL}/platform/subscription/payment/${paymentId}/proof`;

export const openPlatformProof = async (paymentId: string) => {
  const response = await fetch(`${API_BASE_URL}/platform/subscription/payment/${paymentId}/proof`, {
    headers: { Authorization: `Bearer ${getPlatformToken()}` },
  });
  if (!response.ok) throw new Error("Bukti pembayaran gagal dibuka");
  const url = URL.createObjectURL(await response.blob());
  window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
};
