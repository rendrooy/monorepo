import type { BaseRequest, BaseResponse, GuestVisitActionRequest, GuestVisitInterface } from "@monorepo/types";
import type { ServiceStructure } from "../ServiceType";

export interface GuestVisitMapping {
  loadMyGuestVisits: ServiceStructure<{ body: BaseRequest<GuestVisitInterface>; response: BaseResponse<GuestVisitInterface[]> }>;
  createGuestVisit: ServiceStructure<{ body: GuestVisitInterface; response: BaseResponse<GuestVisitInterface> }>;
  updateGuestVisit: ServiceStructure<{ body: GuestVisitInterface; response: BaseResponse }>;
  cancelGuestVisit: ServiceStructure<{ body: GuestVisitActionRequest; response: BaseResponse }>;
  loadGuestGate: ServiceStructure<{ body: BaseRequest<GuestVisitInterface>; response: BaseResponse<GuestVisitInterface[]> }>;
  loadGuestHistory: ServiceStructure<{ body: BaseRequest<GuestVisitInterface>; response: BaseResponse<GuestVisitInterface[]> }>;
  checkInGuest: ServiceStructure<{ body: GuestVisitActionRequest; response: BaseResponse }>;
  checkOutGuest: ServiceStructure<{ body: GuestVisitActionRequest; response: BaseResponse }>;
}
