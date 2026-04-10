import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  async login(email: string, pass: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return { success: false, error: 'E-mail não encontrado.' };

    // Auto-promove o Ricardo a Professor caso tenha sido importado como Aluno
    if (email === 'ricardo.marqueslima@gmail.com' && user.role === 'STUDENT') {
      await this.prisma.user.update({ where: { email }, data: { role: 'TEACHER' } });
      user.role = 'TEACHER';
    }

    if (user.role === 'STUDENT') return { success: false, error: 'Acesso negado. Apenas professores.' };

    let isValid = false;
    if (user.passwordHash.includes(':')) {
      const [hash, salt] = user.passwordHash.split(':');
      const check1 = crypto.createHash('sha256').update(pass + salt).digest('hex');
      const check2 = crypto.createHash('sha256').update(salt + pass).digest('hex');
      if (hash === check1 || hash === check2) isValid = true;
    } else {
      isValid = user.passwordHash === pass;
    }

    if (!isValid) return { success: false, error: 'Senha incorreta.' };

    const token = this.jwtService.sign({ sub: user.id, email: user.email, role: user.role });
    return { success: true, data: { token } };
  }

  verifyAdmin(token: string) {
    try {
      const decoded = this.jwtService.verify(token);
      if (decoded.role === 'STUDENT') throw new Error('Not admin');
      return decoded;
    } catch(e) { return null; }
  }

  async getConfig(token: string) {
    if (!this.verifyAdmin(token)) return { success: false, error: 'Sessão inválida' };
    const courses = await this.prisma.course.findMany({ include: { modules: true } });
    
    const configData: any = { courses: [] };
    courses.forEach(c => {
       const courseIdStr = c.title.includes('Ingl') ? 'ingles' : 'portugues1';
       configData.courses.push({ cursoId: courseIdStr, nome: c.title, codigo: c.inviteCode, numModulos: c.modules.length });
       configData[courseIdStr] = { inviteCode: c.inviteCode };
       c.modules.forEach(m => {
         configData[courseIdStr][`modulo${m.order}_conteudo`] = m.isContentActive;
         configData[courseIdStr][`modulo${m.order}_prova`] = m.isExamActive;
       });
    });
    return { success: true, data: configData };
  }

  async getStudents(token: string, cursoIdStr?: string) {
    if (!this.verifyAdmin(token)) return { success: false };
    let students = await this.prisma.user.findMany({ 
      where: { role: 'STUDENT' }, 
      include: { 
        attempts: { include: { module: { include: { course: true } } } },
        enrollments: { include: { course: true } }
      } 
    });

    // AUTO-MIGRAÇÃO INTELIGENTE
    // Garante que todos estejam matriculados no Inglês e nos cursos onde já fizeram prova
    const allCourses = await this.prisma.course.findMany();
    const englishCourse = allCourses.find(c => c.title.includes('Ingl'));

    for (const s of students) {
      const coursesToEnroll = new Set<string>();
      if (englishCourse) coursesToEnroll.add(englishCourse.id);
      s.attempts.forEach(a => coursesToEnroll.add(a.module.courseId));

      for (const cId of coursesToEnroll) {
        const isEnrolled = s.enrollments.some(e => e.courseId === cId);
        if (!isEnrolled) {
          await this.prisma.enrollment.create({ data: { userId: s.id, courseId: cId } });
          const courseRef = allCourses.find(c => c.id === cId);
          s.enrollments.push({ courseId: cId, course: courseRef } as any);
        }
      }
    }

    if (cursoIdStr && cursoIdStr !== 'all') {
      const keyword = cursoIdStr.includes('ingles') ? 'Ingl' : 'Portug';
      students = students.filter(s => s.enrollments.some(e => e.course.title.includes(keyword)));
    }

    const data = students.map(s => {
      let provasFeitas = s.attempts.length;
      if (cursoIdStr && cursoIdStr !== 'all') {
         const keyword = cursoIdStr.includes('ingles') ? 'Ingl' : 'Portug';
         provasFeitas = s.attempts.filter(a => a.module.course.title.includes(keyword)).length;
      }
      return {
        nome: s.name, email: s.email, 
        cursos: s.enrollments.map(e => e.course.title.split(' -')[0]).join(', '),
        dataRegistro: s.createdAt, provasFeitas: provasFeitas
      };
    });
    return { success: true, data };
  }

  async getAllGrades(token: string, cursoId?: string) {
    if (!this.verifyAdmin(token)) return { success: false };
    const attempts = await this.prisma.attempt.findMany({ include: { user: true, module: { include: { course: true } } } });
    const data = attempts.map(a => ({
      nome: a.user.name, email: a.user.email,
      cursoId: a.module.course.title.includes('Ingl') ? 'ingles' : 'portugues1',
      modulo: a.module.order, nota: a.score, data: a.finishedAt,
      validada: a.isValidated, emailEnviado: a.isEmailSent
    }));
    return { success: true, data };
  }

  async toggleModule(token: string, cursoIdStr: string, moduloOrder: number, tipo: string, habilitado: boolean) {
    if (!this.verifyAdmin(token)) return { success: false };
    const course = await this.prisma.course.findFirst({ where: { title: { contains: cursoIdStr.includes('ingles') ? 'Ingl' : 'Portug' } }, include: { modules: true }});
    const module = course?.modules.find(m => m.order === moduloOrder);
    if (!module) return { success: false, error: 'Módulo não encontrado' };

    if (tipo === 'conteudo') await this.prisma.module.update({ where: { id: module.id }, data: { isContentActive: habilitado } });
    else await this.prisma.module.update({ where: { id: module.id }, data: { isExamActive: habilitado } });
    
    return { success: true };
  }

  async validateGrade(token: string, cursoIdStr: string, email: string, moduloOrder: number) {
    if (!this.verifyAdmin(token)) return { success: false };
    const course = await this.prisma.course.findFirst({ where: { title: { contains: cursoIdStr.includes('ingles') ? 'Ingl' : 'Portug' } }, include: { modules: true }});
    const module = course?.modules.find(m => m.order === moduloOrder);
    const user = await this.prisma.user.findUnique({ where: { email } });
    
    if (!user || !module || !course) return { success: false, error: 'Dados inválidos' };

    const attempt = await this.prisma.attempt.findFirst({ where: { userId: user.id, moduleId: module.id } });
    if (!attempt) return { success: false, error: 'Prova não encontrada' };

    // 1. Valida a nota no banco de dados primeiro
    await this.prisma.attempt.update({ where: { id: attempt.id }, data: { isValidated: true } });

    // 2. Configura o mensageiro (Nodemailer) com os dados do seu arquivo .env
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: parseInt(process.env.SMTP_PORT || '465') === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    let emailEnviado = false;
    try {
      await transporter.sendMail({
        from: `"Seminário Presbiteriano da Amazônia" <${process.env.SMTP_USER}>`,
        to: user.email,
        subject: `Sua nota do Módulo ${module.order} foi validada!`,
        html: `
          <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
            <div style="background-color: #1a5632; color: white; padding: 20px; text-align: center;">
              <img src="https://via.placeholder.com/100x100.png?text=Logo+SPA" alt="Logo SPA" style="width: 80px; height: 80px; border-radius: 50%; border: 3px solid rgba(255,255,255,0.3); margin-bottom: 10px; object-fit: cover;">
              <h2 style="margin: 0;">Seminário Presbiteriano da Amazônia</h2>
            </div>
            <div style="padding: 30px;">
              <h3 style="color: #1a5632;">Olá, ${user.name.split(' ')[0]}!</h3>
              <p>Sua prova do <strong>Módulo ${module.order}</strong> do curso <strong>${course.title}</strong> acaba de ser corrigida e validada pelo professor.</p>
              <div style="background-color: #f4f6f8; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                <p style="margin: 0; font-size: 16px; color: #5d6d7e;">Sua Nota Final</p>
                <p style="margin: 10px 0 0 0; font-size: 36px; font-weight: bold; color: ${attempt.score >= 70 ? '#27ae60' : '#c0392b'};">${attempt.score}%</p>
              </div>
              <p>Continue o bom trabalho e avance para o próximo módulo em nossa plataforma!</p>
              <br>
              <p style="font-size: 12px; color: #888;">Este é um e-mail automático, por favor não responda.</p>
            </div>
          </div>
        `
      });
      emailEnviado = true;
      // Se a internet e a senha do email estiverem OK, marca como Enviado!
      await this.prisma.attempt.update({ where: { id: attempt.id }, data: { isEmailSent: true } });
    } catch (err) {
      console.error('❌ Erro ao enviar e-mail pelo Nodemailer:', err);
    }

    return { success: true, data: { emailEnviado } };
  }

  async updateInviteCode(token: string, cursoIdStr: string, newCode: string) {
    if (!this.verifyAdmin(token)) return { success: false };
    const course = await this.prisma.course.findFirst({ where: { title: { contains: cursoIdStr.includes('ingles') ? 'Ingl' : 'Portug' } }});
    if (course) await this.prisma.course.update({ where: { id: course.id }, data: { inviteCode: newCode } });
    return { success: true };
  }

  async updateAdminPassword(token: string, newPassword: string) {
    const adminInfo = this.verifyAdmin(token);
    if (!adminInfo) return { success: false, error: 'Sessão inválida' };

    await this.prisma.user.update({
      where: { email: adminInfo.email },
      data: { passwordHash: newPassword }
    });
    return { success: true };
  }
}