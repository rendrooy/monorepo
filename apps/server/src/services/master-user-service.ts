import { locales } from '../config';

export const getUserService = async (params: any) => {
    try {
        const BaseResponse = {
            status: 200,
            message: "User data retrieved successfully",
        };
        return BaseResponse;
    } catch (error) {
        const BaseResponse = {
            status: 500,
            message: locales.unable_to_handle_request,
            
        };
        return BaseResponse;
    }
};