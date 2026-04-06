"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
require("dotenv/config");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🔄 Iniciando a migração estrutural para o Novo Banco de Dados...');
    let ptCourse = await prisma.course.findFirst({ where: { title: { contains: 'Português 1' } } });
    if (!ptCourse) {
        ptCourse = await prisma.course.create({
            data: {
                title: 'Português 1 - Seminário Presbiteriano da Amazônia',
                description: 'Um curso interativo de gramática da língua portuguesa, com fundamentos essenciais para a formação teológica e pastoral.',
            },
        });
        console.log(`✅ Curso criado com sucesso: ${ptCourse.title}`);
        const ptModulesData = [
            { order: 1, title: 'Língua, Linguagem e Comunicação', description: 'Conceitos fundamentais de língua e comunicação.' },
            { order: 2, title: 'Fonologia e AFI', description: 'Fonemas, encontros vocálicos e Alfabeto Fonético.' },
            { order: 3, title: 'Acentuação Gráfica', description: 'Todas as regras do Novo Acordo com quizzes interativos.' },
            { order: 4, title: 'Morfologia', description: 'Morfemas, derivação, composição e processos.' },
            { order: 5, title: 'Classes de Palavras', description: 'As dez classes gramaticais com análise morfológica.' },
            { order: 6, title: 'Exercícios de Fixação', description: 'Questões cobrindo todos os módulos.' },
        ];
        for (const mod of ptModulesData) {
            await prisma.module.create({ data: { courseId: ptCourse.id, order: mod.order, title: mod.title, description: mod.description } });
        }
    }
    else {
        console.log(`▶️ Curso '${ptCourse.title}' já existe no banco. Pulando criação.`);
    }
    let enCourse = await prisma.course.findFirst({ where: { title: { contains: 'Inglês Instrumental' } } });
    if (!enCourse) {
        enCourse = await prisma.course.create({
            data: {
                title: 'Inglês Instrumental - Seminário Presbiteriano da Amazônia',
                description: 'Uma jornada interativa para desenvolver habilidades de leitura e compreensão de textos teológicos em língua inglesa.',
            },
        });
        console.log(`✅ Curso criado com sucesso: ${enCourse.title}`);
        const enModulesData = [
            { order: 1, title: 'Inferência Contextual', description: 'Aprenda a descobrir o significado de palavras pelo contexto.' },
            { order: 2, title: 'Cognatos', description: 'Palavras semelhantes entre inglês e português.' },
            { order: 3, title: 'Afixação', description: 'Formação de palavras com prefixos e sufixos.' },
            { order: 4, title: 'Sinônimos e Antônimos', description: 'Relações de significado entre as palavras.' },
            { order: 5, title: 'Morfossintaxe', description: 'Segmentação e estrutura das sentenças.' },
            { order: 6, title: 'Ordem das Palavras', description: 'Pré-modificadores e grupos nominais em inglês.' },
            { order: 7, title: 'Coesão Textual', description: 'Referência pronominal e adverbial.' },
            { order: 8, title: 'Reconhecimento Gramatical', description: 'Pronomes, tempos verbais, comparativos e superlativos.' },
        ];
        for (const mod of enModulesData) {
            await prisma.module.create({ data: { courseId: enCourse.id, order: mod.order, title: mod.title, description: mod.description } });
        }
    }
    else {
        console.log(`▶️ Curso '${enCourse.title}' já existe no banco. Pulando criação.`);
    }
    console.log('🎉 Migração estrutural concluída com sucesso!');
}
main()
    .catch((e) => {
    console.error('❌ Erro ao realizar a migração:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map