const fs = require('fs');
const path = require('path');

const dir = __dirname;
const cssDir = path.join(dir, 'css');
const jsDir = path.join(dir, 'js');

if (!fs.existsSync(cssDir)) fs.mkdirSync(cssDir);
if (!fs.existsSync(jsDir)) fs.mkdirSync(jsDir);

function cleanHtmlFile(filename, cssName, jsName) {
    const filePath = path.join(dir, filename);
    if (!fs.existsSync(filePath)) return;

    let content = fs.readFileSync(filePath, 'utf-8');
    let modified = false;

    // Extrair CSS
    const styleRegex = /<style>([\s\S]*?)<\/style>/i;
    const styleMatch = content.match(styleRegex);
    if (styleMatch) {
        fs.writeFileSync(path.join(cssDir, cssName), styleMatch[1].trim() + '\n');
        content = content.replace(styleRegex, `<link rel="stylesheet" href="css/${cssName}?v=1">`);
        modified = true;
    }

    // Extrair JS (pega o último <script> antes de </body>)
    if (jsName) {
        const scriptRegex = /<script>\s*([\s\S]*?)\s*<\/script>\s*(?=<\/body>)/i;
        const scriptMatch = content.match(scriptRegex);
        if (scriptMatch && scriptMatch[1].trim().length > 0) {
            fs.writeFileSync(path.join(jsDir, jsName), scriptMatch[1].trim() + '\n');
            content = content.replace(scriptRegex, `<script src="js/${jsName}?v=1"></script>\n`);
            modified = true;
        }
    }

    if (modified) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ ${filename} limpo! CSS salvo em css/${cssName} e JS em js/${jsName}`);
    }
}

console.log('🧹 Iniciando a extração de CSS e JS dos arquivos HTML...');

// O Português tem o CSS mais completo (contém IPA, classes de palavras, etc).
// Vamos extraí-lo como o "style.css" principal da plataforma.
cleanHtmlFile('portugues1.html', 'style.css', 'portugues-main.js');

// Para o Inglês, usamos o mesmo style.css e extraímos apenas o seu JS específico.
const inglesPath = path.join(dir, 'ingles.html');
if (fs.existsSync(inglesPath)) {
    let inglesContent = fs.readFileSync(inglesPath, 'utf-8');
    inglesContent = inglesContent.replace(/<style>([\s\S]*?)<\/style>/i, '<link rel="stylesheet" href="css/style.css?v=1">');
    const scriptMatch = inglesContent.match(/<script>\s*([\s\S]*?)\s*<\/script>\s*(?=<\/body>)/i);
    if (scriptMatch && scriptMatch[1].trim().length > 0) {
        fs.writeFileSync(path.join(jsDir, 'ingles-main.js'), scriptMatch[1].trim() + '\n');
        inglesContent = inglesContent.replace(/<script>\s*([\s\S]*?)\s*<\/script>\s*(?=<\/body>)/i, '<script src="js/ingles-main.js?v=1"></script>\n');
    }
    fs.writeFileSync(inglesPath, inglesContent);
    console.log('✅ ingles.html limpo! (Compartilhando o style.css unificado)');
}

// Limpando as outras páginas
cleanHtmlFile('index.html', 'index.css', 'index-main.js');
cleanHtmlFile('admin.html', 'admin.css', null);

console.log('🎉 Limpeza concluída com sucesso! Seus HTMLs agora estão minúsculos e profissionais.');