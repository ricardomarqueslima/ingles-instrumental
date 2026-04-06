const fs = require('fs');
const path = require('path');

console.log('Iniciando a configuração das provas de Português...');

// 1. Garante que a pasta de destino exista
const targetDir = path.join(__dirname, 'exams', 'portugues');
if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
    console.log('📁 Pasta criada:', targetDir);
}

// 2. Conteúdo da Prova da Unidade 1
const exam1 = {
  "module": 1,
  "title": "Prova 1 - Comunicação e Variação Linguística",
  "timeLimit": 3600,
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "prompt": "Segundo o linguista Ferdinand de Saussure, qual é a diferença fundamental entre 'langue' (língua) e 'parole' (fala)?",
      "options": [
        "a) Langue é a fala individual e parole é a gramática normativa.",
        "b) Langue é o sistema abstrato e social; parole é o uso individual e concreto.",
        "c) Langue refere-se à linguagem escrita e parole à linguagem não verbal.",
        "d) Não há diferença, ambas representam o mesmo conceito na comunicação."
      ],
      "correctAnswer": 1
    },
    {
      "id": 2,
      "type": "true_false",
      "prompt": "Avalie as seguintes afirmações sobre Variação Linguística e Preconceito Linguístico:",
      "statements": [
        {
          "id": "2a",
          "text": "A variação diatópica refere-se às diferenças linguísticas entre diferentes regiões geográficas.",
          "isCorrect": true
        },
        {
          "id": "2b",
          "text": "A norma culta é a única variedade aceitável da língua; as demais devem ser eliminadas.",
          "isCorrect": false
        },
        {
          "id": "2c",
          "text": "A adaptação da linguagem de um sermão formal para uma conversa informal de aconselhamento é um exemplo de variação diafásica.",
          "isCorrect": true
        }
      ]
    },
    {
      "id": 3,
      "type": "drag_match",
      "prompt": "Associe os elementos da comunicação de Jakobson aos seus respectivos papéis no contexto de uma pregação no culto:",
      "items": [
        "Emissor",
        "Receptor",
        "Mensagem",
        "Canal"
      ],
      "targets": [
        "O pregador / pastor",
        "A congregação presente",
        "O sermão (conteúdo)",
        "O ar (voz) ou microfone"
      ],
      "correctMapping": {
        "Emissor": "O pregador / pastor",
        "Receptor": "A congregação presente",
        "Mensagem": "O sermão (conteúdo)",
        "Canal": "O ar (voz) ou microfone"
      }
    },
    {
      "id": 4,
      "type": "multiple_choice",
      "prompt": "No que diz respeito à oralidade e à escrita, é correto afirmar que:",
      "options": [
        "a) A escrita é sempre superior e mais importante que a oralidade no ministério.",
        "b) A oralidade utiliza recursos como entonação e gestos, enquanto a escrita se apoia em pontuação e formatação.",
        "c) A oralidade é sempre planejada e permanente, enquanto a escrita é espontânea."
      ],
      "correctAnswer": 1
    }
  ]
};

// 3. Conteúdo da Prova da Unidade 5
const exam5 = {
  "module": 5,
  "title": "Prova 2 - Fonologia, Morfologia e Classes de Palavras",
  "timeLimit": 5400,
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "prompt": "Analise a palavra 'táxi'. Quantas letras e fonemas ela possui, respectivamente?",
      "options": [
        "a) 4 letras e 4 fonemas.",
        "b) 4 letras e 5 fonemas.",
        "c) 5 letras e 4 fonemas.",
        "d) 4 letras e 3 fonemas."
      ],
      "correctAnswer": 1
    },
    {
      "id": 2,
      "type": "true_false",
      "prompt": "Sobre as regras de Acentuação Gráfica do Novo Acordo, julgue as afirmações:",
      "statements": [
        { "id": "2a", "text": "Todas as palavras proparoxítonas (sílaba tônica na antepenúltima) são acentuadas graficamente.", "isCorrect": true },
        { "id": "2b", "text": "Os ditongos abertos (éi, ói, éu) continuam sendo acentuados nas palavras paroxítonas, como em 'ideia'.", "isCorrect": false },
        { "id": "2c", "text": "Hiatos formados por 'i' e 'u' tônicos, sozinhos na sílaba ou seguidos de 's', são acentuados (ex: sa-ú-de).", "isCorrect": true }
      ]
    },
    {
      "id": 3,
      "type": "drag_match",
      "prompt": "Associe o processo de formação de palavras ao seu respectivo exemplo prático:",
      "items": [ "Derivação Parassintética", "Derivação Regressiva", "Composição por Aglutinação", "Derivação Imprópria" ],
      "targets": [ "emagrecer (em + magro + ecer)", "o combate (redução do verbo combater)", "planalto (plano + alto)", "o jantar (verbo usado com função de substantivo)" ],
      "correctMapping": { "Derivação Parassintética": "emagrecer (em + magro + ecer)", "Derivação Regressiva": "o combate (redução do verbo combater)", "Composição por Aglutinação": "planalto (plano + alto)", "Derivação Imprópria": "o jantar (verbo usado com função de substantivo)" }
    },
    {
      "id": 4,
      "type": "column_match",
      "prompt": "Associe a classe gramatical à sua função principal na oração:",
      "leftColumn": [ "Substantivo", "Adjetivo", "Advérbio", "Conjunção" ],
      "rightColumn": [ "Dá nome aos seres, sentimentos e lugares.", "Modifica um verbo, adjetivo ou advérbio, indicando circunstância.", "Atribui característica, estado ou qualidade ao nome.", "Liga orações ou termos de mesma função sintática." ],
      "correctMapping": { "Substantivo": "Dá nome aos seres, sentimentos e lugares.", "Adjetivo": "Atribui característica, estado ou qualidade ao nome.", "Advérbio": "Modifica um verbo, adjetivo ou advérbio, indicando circunstância.", "Conjunção": "Liga orações ou termos de mesma função sintática." }
    },
    {
      "id": 5,
      "type": "fill_blank",
      "prompt": "Complete a análise morfológica com a classe correta de cada palavra na frase: 'Os verdadeiros adoradores oram fervorosamente.'",
      "sentence": "1. Os = ___ | 2. verdadeiros = ___ | 3. adoradores = ___ | 4. oram = ___ | 5. fervorosamente = ___",
      "wordBank": [ "Artigo", "Adjetivo", "Substantivo", "Verbo", "Advérbio", "Pronome" ],
      "correctAnswers": [ "Artigo", "Adjetivo", "Substantivo", "Verbo", "Advérbio" ]
    }
  ]
};

// 4. Salva nos locais corretos
fs.writeFileSync(path.join(targetDir, 'exam1.json'), JSON.stringify(exam1, null, 2));
fs.writeFileSync(path.join(targetDir, 'exam5.json'), JSON.stringify(exam5, null, 2));
console.log('✅ Provas geradas com sucesso na pasta exams/portugues/');

// 5. Apaga os arquivos que foram salvos na raiz por engano
['exam1.json', 'exam5.json'].forEach(file => {
    const wrongPath = path.join(__dirname, file);
    if (fs.existsSync(wrongPath)) {
        fs.unlinkSync(wrongPath);
        console.log(`🗑️  Arquivo antigo removido da raiz: ${file}`);
    }
});

console.log('\n🚀 Tudo pronto! Você já pode abrir o navegador e testar a prova.');