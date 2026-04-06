import { AuthService } from './auth.service';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(body: any): Promise<{
        success: boolean;
        error: string;
        data?: undefined;
    } | {
        success: boolean;
        data: {
            token: string;
            nome: string;
            email: string;
            foto: string | null;
        };
        error?: undefined;
    }>;
    register(body: any): Promise<{
        success: boolean;
        error: string;
        data?: undefined;
    } | {
        success: boolean;
        data: {
            token: string;
            nome: string;
            email: string;
            foto: string | null;
        };
        error?: undefined;
    }>;
    getAccess(body: any): Promise<{
        success: boolean;
        error: string;
        data?: undefined;
    } | {
        success: boolean;
        data: {
            access: {};
            grades: {};
        };
        error?: undefined;
    }>;
    updatePhoto(body: any): Promise<{
        success: boolean;
        error?: undefined;
    } | {
        success: boolean;
        error: string;
    }>;
}
