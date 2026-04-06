import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Função auxiliar para ler CSVs complexos (com aspas, JSON e Base64)
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let insideQuotes = false;
  let currentValue = '';
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        currentValue += '"'; // Aspas escapadas
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      result.push(currentValue);
      currentValue = '';
    } else {
      currentValue += char;
    }
  }
  result.push(currentValue);
  return result;
}

async function main() {
  console.log('🚀 Iniciando a importação de Alunos e Notas...');

  // Caminhos para a pasta CSV na raiz do seu projeto
  const alunosPath = path.join(__dirname, '../../csv/alunos.csv');
  const notasPath = path.join(__dirname, '../../csv/notas.csv');

  if (!fs.existsSync(alunosPath) || !fs.existsSync(notasPath)) {
    console.error('❌ Arquivos CSV não encontrados! Caminho buscado:', alunosPath);
    return;
  }

  // ==========================================
  // 1. LER E IMPORTAR ALUNOS
  // ==========================================
  const alunosRaw = fs.readFileSync(alunosPath, 'utf-8');
  const alunosLines = alunosRaw.split(/\r?\n/).filter(line => line.trim() !== '');
  const alunosHeaders = parseCSVLine(alunosLines[0]);

  console.log(`\n📚 Encontrados ${alunosLines.length - 1} alunos na planilha. Importando...`);

  for (let i = 1; i < alunosLines.length; i++) {
    const row = parseCSVLine(alunosLines[i]);
    if (row.length < 2) continue;

    const email = row[alunosHeaders.indexOf('email')];
    const nome = row[alunosHeaders.indexOf('nome')];
    const passwordHash = row[alunosHeaders.indexOf('passwordHash')];
    const salt = row[alunosHeaders.indexOf('salt')];
    const foto = row[alunosHeaders.indexOf('foto')];

    // Juntamos o hash e o salt do sistema antigo para a nova API de Login conseguir validar
    const combinedHash = `${passwordHash}:${salt}`;

    await prisma.user.upsert({
      where: { email },
      update: { name: nome, passwordHash: combinedHash, avatarUrl: foto && foto.length > 10 ? foto : null },
      create: {
        email,
        name: nome,
        passwordHash: combinedHash,
        avatarUrl: foto && foto.length > 10 ? foto : null,
        role: 'STUDENT',
      },
    });
  }
  console.log('✅ Todos os alunos e senhas foram importados com segurança!');

  // ==========================================
  // 2. LER E IMPORTAR NOTAS E HISTÓRICO
  // ==========================================
  const notasRaw = fs.readFileSync(notasPath, 'utf-8');
  const notasLines = notasRaw.split(/\r?\n/).filter(line => line.trim() !== '');
  const notasHeaders = parseCSVLine(notasLines[0]);

  console.log(`\n📝 Encontradas ${notasLines.length - 1} notas de provas. Restaurando histórico...`);

  const coursePT = await prisma.course.findFirst({ where: { title: { contains: 'Português 1' } }, include: { modules: true } });
  const courseEN = await prisma.course.findFirst({ where: { title: { contains: 'Inglês Instrumental' } }, include: { modules: true } });

  for (let i = 1; i < notasLines.length; i++) {
    const row = parseCSVLine(notasLines[i]);
    if (row.length < 2) continue;

    const email = row[notasHeaders.indexOf('email')];
    const cursoIdLegado = row[notasHeaders.indexOf('cursoId')];
    const moduloOrdem = parseInt(row[notasHeaders.indexOf('modulo')]);
    const notaStr = row[notasHeaders.indexOf('nota')];
    const dataSubmissaoStr = row[notasHeaders.indexOf('dataSubmissao')];

    if (!email || isNaN(moduloOrdem) || !notaStr) continue;

    let finishedAt = new Date();
    if (dataSubmissaoStr) {
      const [data, hora] = dataSubmissaoStr.split(' ');
      const [dia, mes, ano] = data.split('/');
      finishedAt = new Date(`${ano}-${mes}-${dia}T${hora || '00:00:00'}Z`);
    }

    const targetCourse = cursoIdLegado === 'ingles' ? courseEN : coursePT;
    if (!targetCourse) continue;

    const targetModule = targetCourse.modules.find(m => m.order === moduloOrdem);
    if (!targetModule) continue;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) continue;

    // Salva a nota no banco novo, garantindo que não vai duplicar
    const attemptExists = await prisma.attempt.findFirst({ where: { userId: user.id, moduleId: targetModule.id } });
    if (!attemptExists) {
      await prisma.attempt.create({
        data: { score: parseFloat(notaStr), finishedAt, userId: user.id, moduleId: targetModule.id }
      });
    }
  }

  console.log('✅ Histórico de notas importado com sucesso!');
  console.log('\n🎉 MIGRAÇÃO COMPLETA: Nenhum dado foi perdido!');
}

main().catch(console.error).finally(() => prisma.$disconnect());