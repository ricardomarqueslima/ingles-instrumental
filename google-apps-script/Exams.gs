/**
 * Exams.gs - Submissao, Correcao e Consulta de Provas (Multi-Curso)
 *
 * Abas referenciadas:
 *   Notas:     email(0), cursoId(1), modulo(2), nota(3), respostas(4), data(5), tempo(6), validada(7), emailEnviado(8), dataValidacao(9)
 *   Gabarito:  cursoId(0), modulo(1), questao(2), tipo(3), respostaCorreta(4), explicacao(5)
 *   Cursos:    cursoId(0), nome(1), codigo(2), numModulos(3), habilitado(4)
 *   Config:    chave(0), valor(1)
 */

// ========== EXAM START ==========

function examStart(body) {
  var token = body.token;
  var modulo = body.modulo;
  var cursoId = body.cursoId;

  var session = authCheckSession(body);
  if (!session.success) return session;

  if (!cursoId) {
    return { success: false, error: 'cursoId e obrigatorio.' };
  }

  // Verificar se prova esta liberada
  var provaLiberada = getConfigValue(cursoId + '_modulo' + modulo + '_prova');
  if (provaLiberada !== 'true') {
    return { success: false, error: 'Esta prova ainda nao foi liberada pelo professor.' };
  }

  // Verificar se aluno ja fez esta prova (email + cursoId + modulo)
  var notasSheet = getSheet('Notas');
  var notasData = notasSheet.getDataRange().getValues();
  for (var i = 1; i < notasData.length; i++) {
    if (notasData[i][0] && notasData[i][0].toString().toLowerCase() === session.data.email.toLowerCase()
        && notasData[i][1] === cursoId
        && notasData[i][2] == modulo) {
      return { success: false, error: 'Voce ja realizou esta prova. Nota: ' + notasData[i][3] + '%' };
    }
  }

  return {
    success: true,
    data: {
      startTime: new Date().toISOString()
    }
  };
}

// ========== EXAM SUBMIT ==========

function examSubmit(body) {
  var token = body.token;
  var modulo = body.modulo;
  var cursoId = body.cursoId;
  var respostas = body.respostas;
  var tempoGasto = body.tempoGasto;

  var session = authCheckSession(body);
  if (!session.success) return session;

  if (!cursoId) {
    return { success: false, error: 'cursoId e obrigatorio.' };
  }

  // Validar modulo contra numModulos do curso
  var cursosSheet = getSheet('Cursos');
  var cursosData = cursosSheet.getDataRange().getValues();
  var numModulos = 0;

  for (var c = 1; c < cursosData.length; c++) {
    if (cursosData[c][0] === cursoId) {
      numModulos = parseInt(cursosData[c][3], 10) || 0;
      break;
    }
  }

  if (numModulos === 0) {
    return { success: false, error: 'Curso nao encontrado.' };
  }

  if (!modulo || modulo < 1 || modulo > numModulos) {
    return { success: false, error: 'Modulo invalido.' };
  }

  if (!respostas || typeof respostas !== 'object') {
    return { success: false, error: 'Respostas invalidas.' };
  }

  // Verificar se prova esta liberada
  var provaLiberada = getConfigValue(cursoId + '_modulo' + modulo + '_prova');
  if (provaLiberada !== 'true') {
    return { success: false, error: 'Esta prova nao esta liberada.' };
  }

  // Verificar se aluno ja fez esta prova (email + cursoId + modulo)
  var notasSheet = getSheet('Notas');
  var notasData = notasSheet.getDataRange().getValues();
  for (var i = 1; i < notasData.length; i++) {
    if (notasData[i][0] && notasData[i][0].toString().toLowerCase() === session.data.email.toLowerCase()
        && notasData[i][1] === cursoId
        && notasData[i][2] == modulo) {
      return { success: false, error: 'Voce ja realizou esta prova.' };
    }
  }

  // Corrigir prova usando Gabarito
  // Gabarito: cursoId(0), modulo(1), questao(2), tipo(3), respostaCorreta(4), explicacao(5)
  var gabaritoSheet = getSheet('Gabarito');
  var gabaritoData = gabaritoSheet.getDataRange().getValues();

  var acertos = 0;
  var total = 0;
  var detalhes = [];

  for (var g = 1; g < gabaritoData.length; g++) {
    if (gabaritoData[g][0] === cursoId && gabaritoData[g][1] == modulo) {
      total++;
      var questaoId = gabaritoData[g][2].toString();
      var tipo = gabaritoData[g][3];
      var correta = JSON.parse(gabaritoData[g][4]);
      var explicacao = gabaritoData[g][5];

      var respostaAluno = respostas[questaoId];
      var estaCorreta = verificarResposta(tipo, respostaAluno, correta);

      if (estaCorreta) acertos++;

      detalhes.push({
        questao: questaoId,
        tipo: tipo,
        respostaAluno: respostaAluno,
        respostaCorreta: correta,
        correta: estaCorreta,
        explicacao: explicacao
      });
    }
  }

  var nota = total > 0 ? Math.round((acertos / total) * 100) : 0;

  // Salvar nota: email(0), cursoId(1), modulo(2), nota(3), respostas(4), data(5), tempo(6), validada(7), emailEnviado(8), dataValidacao(9)
  notasSheet.appendRow([
    session.data.email.toLowerCase(),
    cursoId,
    modulo,
    nota,
    JSON.stringify(respostas),
    new Date(),
    tempoGasto || 0,
    false,   // validada
    false,   // emailEnviado
    ''       // dataValidacao
  ]);

  return {
    success: true,
    data: {
      nota: nota,
      acertos: acertos,
      total: total,
      detalhes: detalhes
    }
  };
}

// ========== VERIFICAR RESPOSTA ==========

function verificarResposta(tipo, respostaAluno, correta) {
  if (respostaAluno === undefined || respostaAluno === null) return false;

  switch (tipo) {
    case 'multiple_choice':
      return respostaAluno.toString() === correta.toString();

    case 'true_false':
      // correta e um objeto { "2a": true, "2b": false, ... }
      // respostaAluno e um objeto com as mesmas chaves
      if (typeof respostaAluno !== 'object') return false;
      var tfKeys = Object.keys(correta);
      return tfKeys.every(function(k) {
        return respostaAluno[k] !== undefined &&
          respostaAluno[k].toString() === correta[k].toString();
      });

    case 'drag_match':
      // correta e um objeto { "item1": "target1", "item2": "target2", ... }
      // respostaAluno e o mesmo formato
      if (typeof respostaAluno !== 'object') return false;
      var dmKeys = Object.keys(correta);
      return dmKeys.every(function(k) {
        return respostaAluno[k] !== undefined &&
          respostaAluno[k].toString().toLowerCase().trim() === correta[k].toString().toLowerCase().trim();
      });

    case 'fill_blank':
      // correta e um array de strings ["word1", "word2"]
      // respostaAluno e um array de strings
      if (!Array.isArray(respostaAluno) || !Array.isArray(correta)) return false;
      if (respostaAluno.length !== correta.length) return false;
      return correta.every(function(c, idx) {
        return respostaAluno[idx] &&
          respostaAluno[idx].toString().toLowerCase().trim() === c.toString().toLowerCase().trim();
      });

    case 'column_match':
      // Mesmo formato que drag_match
      if (typeof respostaAluno !== 'object') return false;
      var cmKeys = Object.keys(correta);
      return cmKeys.every(function(k) {
        return respostaAluno[k] !== undefined &&
          respostaAluno[k].toString().toLowerCase().trim() === correta[k].toString().toLowerCase().trim();
      });

    default:
      return respostaAluno.toString() === correta.toString();
  }
}

// ========== EXAM GET GRADES ==========

function examGetGrades(body) {
  var token = body.token;
  var cursoId = body.cursoId;

  var session = authCheckSession(body);
  if (!session.success) return session;

  // Notas: email(0), cursoId(1), modulo(2), nota(3), respostas(4), data(5), tempo(6), validada(7), emailEnviado(8), dataValidacao(9)
  var notasSheet = getSheet('Notas');
  var data = notasSheet.getDataRange().getValues();
  var grades = [];

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString().toLowerCase() === session.data.email.toLowerCase()) {
      // Filtrar por cursoId se fornecido
      if (cursoId && data[i][1] !== cursoId) continue;

      grades.push({
        cursoId: data[i][1],
        modulo: data[i][2],
        nota: data[i][3],
        data: data[i][5],
        tempoGasto: data[i][6],
        validada: data[i][7] === true || data[i][7] === 'TRUE'
      });
    }
  }

  return { success: true, data: grades };
}
