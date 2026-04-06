"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoursesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const jwt_1 = require("@nestjs/jwt");
let CoursesService = class CoursesService {
    prisma;
    jwtService;
    constructor(prisma, jwtService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
    }
    async findAll() {
        const courses = await this.prisma.course.findMany({
            include: {
                modules: { orderBy: { order: 'asc' } },
            },
        });
        return courses.map(c => ({
            cursoId: c.title.includes('Ingl') ? 'ingles' : 'portugues1',
            nome: c.title,
            codigo: c.inviteCode,
            numModulos: c.modules.length
        }));
    }
    async getEnrollments(token) {
        try {
            const decoded = this.jwtService.verify(token);
            const enrollments = await this.prisma.enrollment.findMany({
                where: { userId: decoded.sub },
                include: { course: true }
            });
            const data = enrollments.map(e => ({
                cursoId: e.course.title.includes('Ingl') ? 'ingles' : 'portugues1',
                nome: e.course.title
            }));
            return { success: true, data };
        }
        catch (e) {
            return { success: false, error: 'Token inválido' };
        }
    }
    async enrollCourse(token, inviteCode) {
        try {
            const decoded = this.jwtService.verify(token);
            const course = await this.prisma.course.findFirst({ where: { inviteCode } });
            if (!course)
                return { success: false, error: 'Código de convite inválido.' };
            const existing = await this.prisma.enrollment.findUnique({
                where: { userId_courseId: { userId: decoded.sub, courseId: course.id } }
            });
            if (existing)
                return { success: false, error: 'Você já está matriculado neste curso.' };
            await this.prisma.enrollment.create({ data: { userId: decoded.sub, courseId: course.id } });
            return { success: true };
        }
        catch (e) {
            return { success: false, error: 'Sessão inválida' };
        }
    }
};
exports.CoursesService = CoursesService;
exports.CoursesService = CoursesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, jwt_1.JwtService])
], CoursesService);
//# sourceMappingURL=courses.service.js.map