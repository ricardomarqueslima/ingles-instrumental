import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ExamsService } from './exams.service';
import { JwtService } from '@nestjs/jwt';
import * as fs from 'fs';
import * as path from 'path';

@Controller('exams')
export class ExamsController {
  constructor(
    private readonly examsService: ExamsService,
    private jwtService: JwtService
  ) {}

  @Post('submit')
  submitExam(@Body() body: any) {
    try {
      // Garante que apenas alunos logados possam enviar provas
      const decoded = this.jwtService.verify(body.token);
      return this.examsService.submitExam(
        decoded.sub, body.cursoId, body.modulo, body.respostas, body.tempoGasto
      );
    } catch (e) {
      return { success: false, error: 'Sessão inválida ou expirada.' };
    }
  }

  @Get('data/:cursoId/:modulo')
  getExamData(@Param('cursoId') cursoId: string, @Param('modulo') modulo: string) {
    console.log(`\n[ExamsController] Solicitando prova: ${cursoId} módulo ${modulo}`);
    // Tentativa 1: Resolve a partir do diretório onde o comando foi rodado (backend)
    let filePath = path.join(process.cwd(), '..', 'exams', cursoId, `exam${modulo}.json`);

    // Tentativa 2: Fallback para o caso do NestJS estar rodando de dentro da pasta "dist"
    if (!fs.existsSync(filePath)) {
      filePath = path.join(__dirname, '..', '..', '..', 'exams', cursoId, `exam${modulo}.json`);
    }
    // Tentativa 3: Arquivo solto na raiz do projeto (como estava no Português original)
    if (!fs.existsSync(filePath)) {
      filePath = path.join(process.cwd(), '..', `exam${modulo}.json`);
    }

    if (!fs.existsSync(filePath)) {
      console.log(`[ExamsController] ❌ Arquivo não encontrado: ${filePath}`);
      // Retorna 200 com a string de erro para o Frontend exibir exatamente onde procurou
      return { error: `Arquivo da prova não encontrado no caminho:\n${filePath}` };
    }

    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const cleanContent = fileContent.replace(/^\uFEFF/, ''); // Remove caracteres invisíveis
      const parsed = JSON.parse(cleanContent);
      
      // SEGURANÇA MÁXIMA: Remove o gabarito antes de enviar para o frontend
      if (parsed.questions) {
        parsed.questions = parsed.questions.map((q: any) => {
          const safeQ = { ...q };
          delete safeQ.correctAnswer;
          delete safeQ.correctAnswers;
          delete safeQ.correctMapping;
          if (safeQ.statements) {
            safeQ.statements = safeQ.statements.map((st: any) => {
              const safeSt = { ...st };
              delete safeSt.isCorrect;
              return safeSt;
            });
          }
          return safeQ;
        });
      }

      console.log(`[ExamsController] ✅ Prova enviada com sucesso (Gabarito Oculto)!`);
      return parsed;
    } catch (e) {
      console.error(`[ExamsController] ❌ Erro de formatação no arquivo JSON:`, e);
      return { error: 'O arquivo da prova existe, mas possui erros de formatação no JSON.' };
    }
  }
}