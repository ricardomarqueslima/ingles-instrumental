import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
export declare class CoursesService {
    private prisma;
    private jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    findAll(): Promise<{
        cursoId: string;
        nome: string;
        codigo: string;
        numModulos: number;
    }[]>;
    getEnrollments(token: string): Promise<{
        success: boolean;
        data: {
            cursoId: string;
            nome: string;
        }[];
        error?: undefined;
    } | {
        success: boolean;
        error: string;
        data?: undefined;
    }>;
    enrollCourse(token: string, inviteCode: string): Promise<{
        success: boolean;
        error: string;
    } | {
        success: boolean;
        error?: undefined;
    }>;
}
