import type { Metadata } from "./base-response";

export interface BaseRequest {
    metadata?: Metadata | null;
}