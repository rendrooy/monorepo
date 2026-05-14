import type { Metadata } from "./base-response";

export interface BaseRequest<T = any|null> {
    metadata?: Metadata | null;
    params?: T
}
