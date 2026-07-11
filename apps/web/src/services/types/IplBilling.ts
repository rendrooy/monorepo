import type {
  AppNotificationInterface,
  BaseRequest,
  BaseResponse,
  IplBillBatchInterface,
  IplBillInterface,
  IplBillPublishResult,
} from "@monorepo/types";
import type { ServiceStructure } from "../ServiceType";

export interface IplBillingMapping {
  loadIplBatch: ServiceStructure<{ body: BaseRequest<IplBillBatchInterface>; response: BaseResponse<IplBillBatchInterface[]> }>;
  getIplBatch: ServiceStructure<{ body: IplBillBatchInterface; response: BaseResponse<IplBillBatchInterface> }>;
  insertIplBatch: ServiceStructure<{ body: IplBillBatchInterface; response: BaseResponse<IplBillBatchInterface> }>;
  updateIplBatch: ServiceStructure<{ body: IplBillBatchInterface; response: BaseResponse<IplBillBatchInterface> }>;
  publishIplBatch: ServiceStructure<{ body: IplBillBatchInterface; response: BaseResponse<IplBillPublishResult> }>;
  cancelIplBatch: ServiceStructure<{ body: IplBillBatchInterface; response: BaseResponse }>;
  loadIplBill: ServiceStructure<{ body: BaseRequest<IplBillInterface>; response: BaseResponse<IplBillInterface[]> }>;
  loadMyIplBill: ServiceStructure<{ body: BaseRequest<IplBillInterface>; response: BaseResponse<IplBillInterface[]> }>;
  loadNotification: ServiceStructure<{ body: Record<string, never>; response: BaseResponse<AppNotificationInterface[]> }>;
  readNotification: ServiceStructure<{ body: { id?: string | null }; response: BaseResponse }>;
}
