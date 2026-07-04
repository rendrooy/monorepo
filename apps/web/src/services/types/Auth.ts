import type {
    AuthLoginRequest,
    AuthLoginResponse,
    AuthMenuTreeInterface,
    AuthUserInterface,
    BaseResponse,
} from "@monorepo/types";
import type { ServiceStructure } from "../ServiceType";

export interface AuthMapping {
    loginAuth: ServiceStructure<{
        body: AuthLoginRequest;
        response: BaseResponse<AuthLoginResponse | null>;
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
