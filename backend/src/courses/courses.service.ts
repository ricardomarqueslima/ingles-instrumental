import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  async findAll() {
    // Busca todos os cursos e já inclui os módulos ordenados pela coluna "order"
    const courses = await this.prisma.course.findMany({
      include: {
        modules: { orderBy: { order: 'asc' } },
      },
    });

    // Formata os dados para o padrão que o frontend (index.html) espera
    return courses.map(c => ({
      cursoId: c.title.includes('Ingl') ? 'ingles' : 'portugues1',
      nome: c.title,
      codigo: c.inviteCode,
      numModulos: c.modules.length
    }));
  }

  async getEnrollments(token: string) {
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
    } catch(e) {
      return { success: false, error: 'Token inválido' };
    }
  }

  async enrollCourse(token: string, inviteCode: string) {
    try {
      const decoded = this.jwtService.verify(token);
      const course = await this.prisma.course.findFirst({ where: { inviteCode } });
      if (!course) return { success: false, error: 'Código de convite inválido.' };

      const existing = await this.prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: decoded.sub, courseId: course.id } }
      });
      if (existing) return { success: false, error: 'Você já está matriculado neste curso.' };

      await this.prisma.enrollment.create({ data: { userId: decoded.sub, courseId: course.id } });
      return { success: true };
    } catch(e) {
      return { success: false, error: 'Sessão inválida' };
    }
  }
}