import type {
    AuthLoginRequest,
    AuthLoginResponse,
    AuthMenuTreeInterface,
    AuthRegisterRequest,
    AuthUserInterface,
    BaseResponse,
    MasterUserInterface,
} from "@monorepo/types";
import type { ServiceStructure } from "../ServiceType";

export interface AuthMapping {
    loginAuth: ServiceStructure<{
        body: AuthLoginRequest;
        response: BaseResponse<AuthLoginResponse | null>;
    }>;
    registerAuth: ServiceStructure<{
        body: AuthRegisterRequest;
        response: BaseResponse<MasterUserInterface | null>;
    }>;
    meAuth: ServiceStructure<{
        body: Record<string, never>;
        response: BaseResponse<AuthUserInterface | null>;
    }>;
    menuAuth: ServiceStructure<{
        body: Record<string, never>;
        response: BaseResponse<AuthMenuTreeInterface[]>;
    }>;
}
