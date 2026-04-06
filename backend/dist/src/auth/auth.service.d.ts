import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
export declare class AuthService {
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
            nome: string;
            email: string;
            foto: string | null;
        };
        error?: undefined;
    }>;
    register(data: any): Promise<{
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
    getAccess(token: string, cursoId: string): Promise<{
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
    updatePhoto(token: string, foto: string): Promise<{
        success: boolean;
        error?: undefined;
    } | {
        success: boolean;
        error: string;
    }>;
}
