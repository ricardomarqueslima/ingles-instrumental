import { PrismaService } from '../prisma/prisma.service';
export declare class ExamsService {
    private prisma;
    constructor(prisma: PrismaService);
    submitExam(userId: string, cursoId: string, moduloOrdem: number, respostas: any, tempoGasto: number): Promise<{
        success: boolean;
        error: string;
        data?: undefined;
    } | {
        success: boolean;
        data: {
            nota: number;
            acertos: number;
            total: any;
            detalhes: any[];
            mensagem: string;
        };
        error?: undefined;
    }>;
}
