import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Iniciando a migração do curso Legado para o Novo Banco de Dados...');

  // 1. Cria o Curso Principal
  const course = await prisma.course.create({
    data: {
      title: 'Português 1 - Seminário Presbiteriano da Amazônia',
      description: 'Um curso interativo de gramática da língua portuguesa, com fundamentos essenciais para a formação teológica e pastoral.',
    },
  });
  console.log(`✅ Curso criado com sucesso: ${course.title}`);

  // 2. Módulos extraídos do portugues1.html
  const modulesData = [
    { order: 1, title: 'Língua, Linguagem e Comunicação', description: 'Conceitos fundamentais de língua e comunicação.' },
    { order: 2, title: 'Fonologia e AFI', description: 'Fonemas, encontros vocálicos e Alfabeto Fonético.' },
    { order: 3, title: 'Acentuação Gráfica', description: 'Todas as regras do Novo Acordo com quizzes interativos.' },
    { order: 4, title: 'Morfologia', description: 'Morfemas, derivação, composição e processos.' },
    { order: 5, title: 'Classes de Palavras', description: 'As dez classes gramaticais com análise morfológica.' },
    { order: 6, title: 'Exercícios de Fixação', description: 'Questões cobrindo todos os módulos.' },
  ];

  // 3. Inserindo os módulos vinculados ao curso
  for (const mod of modulesData) {
    await prisma.module.create({
      data: {
        courseId: course.id,
        order: mod.order,
        title: mod.title,
        description: mod.description,
      },
    });
    console.log(`✅ Módulo ${mod.order} inserido: ${mod.title}`);
  }

  console.log('🎉 Migração estrutural inicial concluída com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro ao realizar a migração:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });