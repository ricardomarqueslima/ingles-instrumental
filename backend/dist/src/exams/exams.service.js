"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExamsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const nodemailer = __importStar(require("nodemailer"));
let ExamsService = class ExamsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async submitExam(userId, cursoId, moduloOrdem, respostas, tempoGasto) {
        const course = await this.prisma.course.findFirst({
            where: { title: { contains: cursoId === 'ingles' ? 'Ingl' : 'Portug' } },
            include: { modules: true }
        });
        if (!course)
            return { success: false, error: 'Curso não encontrado.' };
        const module = course.modules.find(m => m.order === moduloOrdem);
        if (!module)
            return { success: false, error: 'Módulo não encontrado.' };
        const attemptExists = await this.prisma.attempt.findFirst({
            where: { userId, moduleId: module.id }
        });
        if (attemptExists) {
            return { success: false, error: 'Você já realizou esta prova anteriormente.' };
        }
        let filePath = path.join(process.cwd(), '..', 'exams', cursoId, `exam${moduloOrdem}.json`);
        if (!fs.existsSync(filePath))
            filePath = path.join(__dirname, '..', '..', '..', 'exams', cursoId, `exam${moduloOrdem}.json`);
        if (!fs.existsSync(filePath))
            filePath = path.join(process.cwd(), '..', `exam${moduloOrdem}.json`);
        if (!fs.existsSync(filePath)) {
            return { success: false, error: 'Gabarito não encontrado no servidor.' };
        }
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const examDef = JSON.parse(fileContent.replace(/^\uFEFF/, ''));
        let acertos = 0;
        const totalQuestoes = examDef.questions ? examDef.questions.length : 0;
        const detalhes = [];
        if (totalQuestoes > 0) {
            for (let i = 0; i < totalQuestoes; i++) {
                const q = examDef.questions[i];
                const studentAns = respostas[q.id];
                let isCorrect = false;
                let respostaAlunoText = 'Em branco';
                let gabaritoText = 'Não disponível';
                if (studentAns !== undefined && studentAns !== null) {
                    switch (q.type) {
                        case 'multiple_choice':
                            isCorrect = studentAns === q.correctAnswer;
                            respostaAlunoText = q.options[studentAns] || 'Alternativa inválida';
                            gabaritoText = q.options[q.correctAnswer];
                            break;
                        case 'true_false':
                            isCorrect = true;
                            const tfRes = [];
                            const tfGab = [];
                            if (q.statements) {
                                for (const st of q.statements) {
                                    const ans = studentAns[st.id];
                                    if (ans !== st.isCorrect)
                                        isCorrect = false;
                                    tfRes.push(`"${st.text}": ${ans ? 'V' : 'F'}`);
                                    tfGab.push(`"${st.text}": ${st.isCorrect ? 'V' : 'F'}`);
                                }
                            }
                            respostaAlunoText = tfRes.join(' | ');
                            gabaritoText = tfGab.join(' | ');
                            break;
                        case 'drag_match':
                        case 'column_match':
                            isCorrect = true;
                            const correctMapping = q.correctMapping || {};
                            const dmRes = [];
                            const dmGab = [];
                            for (const key in correctMapping) {
                                if (studentAns[key] !== correctMapping[key])
                                    isCorrect = false;
                                dmRes.push(`${key} ➔ ${studentAns[key] || 'Não respondido'}`);
                                dmGab.push(`${key} ➔ ${correctMapping[key]}`);
                            }
                            if (Object.keys(studentAns).length !== Object.keys(correctMapping).length)
                                isCorrect = false;
                            respostaAlunoText = dmRes.join(' | ');
                            gabaritoText = dmGab.join(' | ');
                            break;
                        case 'fill_blank':
                            isCorrect = true;
                            const correctAnswers = q.correctAnswers || [];
                            if (studentAns.length !== correctAnswers.length)
                                isCorrect = false;
                            else {
                                for (let j = 0; j < correctAnswers.length; j++) {
                                    if (studentAns[j] !== correctAnswers[j])
                                        isCorrect = false;
                                }
                            }
                            respostaAlunoText = studentAns.join(', ');
                            gabaritoText = correctAnswers.join(', ');
                            break;
                    }
                }
                else {
                    switch (q.type) {
                        case 'multiple_choice':
                            gabaritoText = q.options[q.correctAnswer];
                            break;
                        case 'true_false':
                            gabaritoText = (q.statements || []).map((s) => `"${s.text}": ${s.isCorrect ? 'V' : 'F'}`).join(' | ');
                            break;
                        case 'drag_match':
                        case 'column_match':
                            gabaritoText = Object.entries(q.correctMapping || {}).map(([k, v]) => `${k} ➔ ${v}`).join(' | ');
                            break;
                        case 'fill_blank':
                            gabaritoText = (q.correctAnswers || []).join(', ');
                            break;
                    }
                }
                if (isCorrect)
                    acertos++;
                detalhes.push({
                    questao: i + 1,
                    correta: isCorrect,
                    enunciado: q.prompt ? q.prompt.replace(/<[^>]+>/g, '') : 'Questão',
                    respostaAluno: respostaAlunoText,
                    gabarito: gabaritoText
                });
            }
        }
        const notaFinal = totalQuestoes > 0 ? Math.round((acertos / totalQuestoes) * 100) : 0;
        await this.prisma.attempt.create({
            data: {
                score: notaFinal,
                userId: userId,
                moduleId: module.id,
                details: JSON.stringify(detalhes)
            }
        });
        const user = await this.prisma.user.findUnique({
            where: { id: userId }
        });
        let htmlGabarito = `
      <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
        <div style="background-color: #1a5632; padding: 20px; text-align: center; color: white;">
          <h2 style="margin: 0;">Resultado da Prova</h2>
          <p style="margin: 5px 0 0 0; font-size: 1.1em;">${examDef.title}</p>
        </div>
        <div style="padding: 20px;">
          <p>Olá, <strong>${user?.name || 'Aluno'}</strong>!</p>
          <p>Sua prova foi recebida e processada com sucesso. Sua nota final foi: <strong style="font-size: 1.3em; color: ${notaFinal >= 70 ? '#27ae60' : '#c0392b'};">${notaFinal}%</strong></p>
          <hr style="border: 0; border-bottom: 1px solid #eee; margin: 25px 0;" />
          <h3 style="color: #1a5632; margin-bottom: 15px;">Seu Gabarito Detalhado:</h3>
    `;
        detalhes.forEach(d => {
            const corBorda = d.correta ? '#27ae60' : '#e74c3c';
            const icone = d.correta ? '✅ Acertou' : '❌ Errou';
            htmlGabarito += `
        <div style="margin-bottom: 20px; padding: 15px; border-radius: 8px; background-color: #f9f9f9; border-left: 5px solid ${corBorda};">
          <p style="margin: 0 0 10px 0; font-weight: bold;">Questão ${d.questao}: <span style="font-weight: normal;">${d.enunciado}</span></p>
          <p style="margin: 0 0 5px 0; font-size: 0.9em;"><strong>Sua resposta:</strong> <span style="color: #555;">${d.respostaAluno}</span></p>
          <p style="margin: 0 0 5px 0; font-size: 0.9em;"><strong>Gabarito correto:</strong> <span style="color: #1a5632; font-weight: bold;">${d.gabarito}</span></p>
          <p style="margin: 5px 0 0 0; font-size: 0.9em;"><strong>Resultado:</strong> ${icone}</p>
        </div>
      `;
        });
        htmlGabarito += `
        </div>
      </div>
    `;
        if (user && user.email) {
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port: parseInt(process.env.SMTP_PORT || '587'),
                secure: false,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });
            try {
                await transporter.sendMail({
                    from: `"Plataforma SPA" <${process.env.SMTP_USER}>`,
                    to: user.email,
                    subject: `Resultado da sua prova: ${examDef.title}`,
                    html: htmlGabarito,
                });
            }
            catch (err) {
                console.error('❌ Erro ao enviar e-mail de gabarito:', err);
            }
        }
        return {
            success: true,
            data: {
                nota: notaFinal, acertos: acertos, total: totalQuestoes, detalhes: detalhes,
                mensagem: 'Prova finalizada e salva com sucesso no Banco de Dados!'
            }
        };
    }
};
exports.ExamsService = ExamsService;
exports.ExamsService = ExamsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ExamsService);
//# sourceMappingURL=exams.service.js.map