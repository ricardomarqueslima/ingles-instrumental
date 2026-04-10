import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';

@Injectable()
export class AuthService {
  private resetCodes = new Map<string, { code: string; expiresAt: number }>();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  async login(email: string, pass: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return { success: false, error: 'E-mail não encontrado.' };

    let isValid = false;
    
    // Verifica se a senha veio do sistema legado (possui os dois pontos seprando hash:salt)
    if (user.passwordHash.includes(':')) {
      const [hash, salt] = user.passwordHash.split(':');
      // O sistema legado costuma usar SHA-256 combinando a senha e o salt
      const check1 = crypto.createHash('sha256').update(pass + salt).digest('hex');
      const check2 = crypto.createHash('sha256').update(salt + pass).digest('hex');
      
      if (hash === check1 || hash === check2) {
        isValid = true;
      }
    } else {
      // Fallback para novos usuários (comparação direta simples)
      isValid = user.passwordHash === pass; 
    }

    if (!isValid) return { success: false, error: 'Senha incorreta.' };

    // Gera o Token de Acesso Seguro (JWT)
    const token = this.jwtService.sign({ sub: user.id, email: user.email, role: user.role });

    return {
      success: true,
      data: { token, nome: user.name, email: user.email, foto: user.avatarUrl }
    };
  }

  async register(data: any) {
    const userExists = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (userExists) return { success: false, error: 'E-mail já cadastrado.' };

    const newUser = await this.prisma.user.create({
      data: {
        name: data.nome,
        email: data.email,
        passwordHash: data.password, // Em produção futura, aplicaremos um hash novo aqui
        avatarUrl: data.foto || null,
      }
    });

    const token = this.jwtService.sign({ sub: newUser.id, email: newUser.email, role: newUser.role });
    return {
      success: true,
      data: { token, nome: newUser.name, email: newUser.email, foto: newUser.avatarUrl }
    };
  }

  async getAccess(token: string, cursoId: string) {
    try {
      const decoded = this.jwtService.verify(token);
      
      const course = await this.prisma.course.findFirst({
        where: { title: { contains: cursoId === 'ingles' ? 'Ingl' : 'Portug' } },
        include: { modules: true }
      });

      if (!course) return { success: false, error: 'Curso não encontrado' };

      // Busca todo o histórico de provas deste aluno neste curso específico
      const attempts = await this.prisma.attempt.findMany({
        where: { userId: decoded.sub, moduleId: { in: course.modules.map(m => m.id) } },
        include: { module: true }
      });

      const grades = {};
      attempts.forEach(a => {
        grades[`modulo${a.module.order}`] = { nota: a.score, validada: true };
      });

      const access = {};
      course.modules.forEach(m => {
        access[`modulo${m.order}_conteudo`] = m.isContentActive; 
        access[`modulo${m.order}_prova`] = m.isExamActive;    
      });

      return { success: true, data: { access, grades } };
    } catch(e) {
      return { success: false, error: 'Token inválido' };
    }
  }

  async updatePhoto(token: string, foto: string) {
    try {
      const decoded = this.jwtService.verify(token);
      await this.prisma.user.update({
        where: { id: decoded.sub },
        data: { avatarUrl: foto }
      });
      return { success: true };
    } catch(e) {
      return { success: false, error: 'Sessão inválida' };
    }
  }

  async forgotPassword(email: string) {
    if (!email) return { success: false, error: 'Informe o e-mail.' };

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return { success: false, error: 'E-mail não encontrado.' };

    // Gera código de 6 dígitos válido por 15 minutos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    this.resetCodes.set(email, { code, expiresAt: Date.now() + 15 * 60 * 1000 });

    // Envia por e-mail
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: parseInt(process.env.SMTP_PORT || '465') === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    try {
      await transporter.sendMail({
        from: `"Plataforma SPA" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Código de recuperação de senha - Plataforma SPA',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
            <div style="background-color: #1a5632; padding: 20px; text-align: center; color: white;">
              <h2 style="margin: 0;">Recuperação de Senha</h2>
            </div>
            <div style="padding: 24px; text-align: center;">
              <p>Olá, <strong>${user.name}</strong>!</p>
              <p>Você solicitou a recuperação da sua senha. Use o código abaixo:</p>
              <div style="font-size: 2em; font-weight: bold; letter-spacing: 8px; color: #1a5632; background: #f0f7f3; padding: 16px; border-radius: 10px; margin: 20px 0;">${code}</div>
              <p style="color: #888; font-size: 0.85em;">Este código expira em 15 minutos.</p>
              <p style="color: #888; font-size: 0.85em;">Se você não solicitou isso, ignore este e-mail.</p>
            </div>
          </div>
        `,
      });
      return { success: true, message: 'Código enviado para o seu e-mail.' };
    } catch (err) {
      console.error('Erro ao enviar e-mail de recuperação:', err);
      return { success: false, error: 'Erro ao enviar e-mail. Tente novamente.' };
    }
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    if (!email || !code || !newPassword) {
      return { success: false, error: 'Preencha todos os campos.' };
    }
    if (newPassword.length < 6) {
      return { success: false, error: 'A senha deve ter pelo menos 6 caracteres.' };
    }

    const stored = this.resetCodes.get(email);
    if (!stored) {
      return { success: false, error: 'Nenhum código solicitado para este e-mail.' };
    }
    if (Date.now() > stored.expiresAt) {
      this.resetCodes.delete(email);
      return { success: false, error: 'Código expirado. Solicite um novo.' };
    }
    if (stored.code !== code) {
      return { success: false, error: 'Código incorreto.' };
    }

    // Atualiza a senha
    await this.prisma.user.update({
      where: { email },
      data: { passwordHash: newPassword },
    });

    this.resetCodes.delete(email);
    return { success: true, message: 'Senha alterada com sucesso!' };
  }
}