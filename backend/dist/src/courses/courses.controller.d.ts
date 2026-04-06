import { CoursesService } from './courses.service';
export declare class CoursesController {
    private readonly coursesService;
    constructor(coursesService: CoursesService);
    findAll(): Promise<{
        cursoId: string;
        nome: string;
        codigo: string;
        numModulos: number;
    }[]>;
    getEnrollments(body: any): Promise<{
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
    enrollCourse(body: any): Promise<{
        success: boolean;
        error: string;
    } | {
        success: boolean;
        error?: undefined;
    }>;
}
