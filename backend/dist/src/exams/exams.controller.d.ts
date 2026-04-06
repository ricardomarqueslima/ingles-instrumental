import { ExamsService } from './exams.service';
import { JwtService } from '@nestjs/jwt';
export declare class ExamsController {
    private readonly examsService;
    private jwtService;
    constructor(examsService: ExamsService, jwtService: JwtService);
    submitExam(body: any): Promise<{
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
    }> | {
        success: boolean;
        error: string;
    };
    getExamData(cursoId: string, modulo: string): any;
}
