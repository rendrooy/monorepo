import type { Metadata } from "./base-response";

export interface BaseRequest<T = unknown | null> {
    metadata?: Metadata | null;
    params?: T
}
