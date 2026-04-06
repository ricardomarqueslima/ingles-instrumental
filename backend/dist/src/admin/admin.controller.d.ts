import { AdminService } from './admin.service';
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    login(body: any): Promise<{
        success: boolean;
        error: string;
        data?: undefined;
    } | {
        success: boolean;
        data: {
            token: string;
        };
        error?: undefined;
    }>;
    getConfig(body: any): Promise<{
        success: boolean;
        error: string;
        data?: undefined;
    } | {
        success: boolean;
        data: any;
        error?: undefined;
    }>;
    getStudents(body: any): Promise<{
        success: boolean;
        data?: undefined;
    } | {
        success: boolean;
        data: {
            nome: string;
            email: string;
            cursos: string;
            dataRegistro: Date;
            provasFeitas: number;
        }[];
    }>;
    getAllGrades(body: any): Promise<{
        success: boolean;
        data?: undefined;
    } | {
        success: boolean;
        data: {
            nome: string;
            email: string;
            cursoId: string;
            modulo: number;
            nota: number;
            data: Date;
            validada: boolean;
            emailEnviado: boolean;
        }[];
    }>;
    toggleModule(body: any): Promise<{
        success: boolean;
        error?: undefined;
    } | {
        success: boolean;
        error: string;
    }>;
    validateGrade(body: any): Promise<{
        success: boolean;
        error?: undefined;
        data?: undefined;
    } | {
        success: boolean;
        error: string;
        data?: undefined;
    } | {
        success: boolean;
        data: {
            emailEnviado: boolean;
        };
        error?: undefined;
    }>;
    updateInviteCode(body: any): Promise<{
        success: boolean;
    }>;
    updateAdminPassword(body: any): Promise<{
        success: boolean;
        error: string;
    } | {
        success: boolean;
        error?: undefined;
    }>;
}
