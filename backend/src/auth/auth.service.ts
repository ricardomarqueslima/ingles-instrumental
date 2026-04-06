import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
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
}