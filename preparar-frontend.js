const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const sourceDir = __dirname;
const destDir = path.join(__dirname, 'deploy-frontend');
const zipName = 'frontend-spa.zip';

console.log('🚀 Iniciando a separação dos arquivos do Frontend...\n');

// 1. Criar pasta temporária limpa
if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true, force: true });
}
fs.mkdirSync(destDir);

// 2. Pastas permitidas (Mídia e Assets visuais)
const foldersToCopy = ['css', 'js', 'imagens', 'audio', 'videos', 'fonemas-wav'];

foldersToCopy.forEach(folder => {
    const srcPath = path.join(sourceDir, folder);
    const destPath = path.join(destDir, folder);
    if (fs.existsSync(srcPath)) {
        fs.cpSync(srcPath, destPath, { recursive: true });
        console.log(`📁 Pasta copiada: ${folder}/`);
    }
});

// 3. Arquivos HTML
const files = fs.readdirSync(sourceDir);
files.forEach(file => {
    if (file.endsWith('.html')) {
        fs.copyFileSync(path.join(sourceDir, file), path.join(destDir, file));
        console.log(`📄 Arquivo copiado: ${file}`);
    }
});

console.log('\n📦 Empacotando (Zipando) os arquivos...');

// 4. Gerar o arquivo ZIP automaticamente usando o comando do Mac
try {
    // Entra na pasta e zipa o conteúdo dela para que a raiz do zip sejam os arquivos diretamente
    execSync(`cd deploy-frontend && zip -r ../${zipName} . -q`);
    console.log(`\n✅ SUCESSO ABSOLUTO!`);
    console.log(`O arquivo "${zipName}" foi criado na raiz do seu projeto.`);
} catch (error) {
    console.log(`\n⚠️ Ocorreu um erro ao zipar. Por favor, entre na pasta "deploy-frontend", selecione tudo e comprima manualmente.`);
}