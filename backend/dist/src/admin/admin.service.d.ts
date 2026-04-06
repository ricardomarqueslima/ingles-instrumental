import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
export declare class AdminService {
    private prisma;
    private jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    login(email: string, pass: string): Promise<{
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
    verifyAdmin(token: string): any;
    getConfig(token: string): Promise<{
        success: boolean;
        error: string;
        data?: undefined;
    } | {
        success: boolean;
        data: any;
        error?: undefined;
    }>;
    getStudents(token: string, cursoIdStr?: string): Promise<{
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
    getAllGrades(token: string, cursoId?: string): Promise<{
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
    toggleModule(token: string, cursoIdStr: string, moduloOrder: number, tipo: string, habilitado: boolean): Promise<{
        success: boolean;
        error?: undefined;
    } | {
        success: boolean;
        error: string;
    }>;
    validateGrade(token: string, cursoIdStr: string, email: string, moduloOrder: number): Promise<{
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
    updateInviteCode(token: string, cursoIdStr: string, newCode: string): Promise<{
        success: boolean;
    }>;
    updateAdminPassword(token: string, newPassword: string): Promise<{
        success: boolean;
        error: string;
    } | {
        success: boolean;
        error?: undefined;
    }>;
}
