/**
 * Email.gs - Envio de Email com Prova Corrigida (Multi-Curso)
 *
 * Gabarito: cursoId(0), modulo(1), questao(2), tipo(3), respostaCorreta(4), explicacao(5)
 * Notas: email(0), cursoId(1), modulo(2), nota(3), respostas(4), ...
 */

var COURSE_MODULE_NAMES = {
  ingles: {
    courseName: 'Ingles Instrumental',
    courseCode: 'CG05',
    modules: {
      1: 'Inferencia Contextual', 2: 'Cognatos', 3: 'Afixacao (Prefixos e Sufixos)',
      4: 'Sinonimia e Antonimia', 5: 'Aspectos Morfossintaticos',
      6: 'Ordem das Palavras', 7: 'Coesao Textual', 8: 'Reconhecimento Gramatical'
    }
  },
  portugues1: {
    courseName: 'Portugues 1',
    courseCode: 'CG01',
    modules: {
      1: 'Lingua, Linguagem e Comunicacao', 2: 'Introducao a Fonetica',
      3: 'Introducao a Morfologia', 4: 'Classe de Palavras'
    }
  }
};

function enviarEmailNota(email, cursoId, modulo, nota, respostasJSON) {
  try {
    cursoId = cursoId || 'ingles';

    var alunosSheet = getSheet('Alunos');
    var alunoResult = findRowByEmail(alunosSheet, email);
    var nomeAluno = alunoResult ? alunoResult.data[1] : email;

    var gabaritoSheet = getSheet('Gabarito');
    var gabaritoData = gabaritoSheet.getDataRange().getValues();

    var respostasAluno;
    try { respostasAluno = typeof respostasJSON === 'string' ? JSON.parse(respostasJSON) : respostasJSON; }
    catch(e) { respostasAluno = {}; }

    var questoes = [];
    // Gabarito: cursoId(0), modulo(1), questao(2), tipo(3), respostaCorreta(4), explicacao(5)
    for (var i = 1; i < gabaritoData.length; i++) {
      if (gabaritoData[i][0] === cursoId && gabaritoData[i][1] == modulo) {
        var qId = gabaritoData[i][2].toString();
        var tipo = gabaritoData[i][3];
        var correta = JSON.parse(gabaritoData[i][4]);
        var explicacao = gabaritoData[i][5];
        var respostaAluno = respostasAluno[qId];
        var estaCorreta = verificarResposta(tipo, respostaAluno, correta);
        questoes.push({ numero: qId, tipo: tipo, respostaAluno: respostaAluno, respostaCorreta: correta, correta: estaCorreta, explicacao: explicacao });
      }
    }

    // Nomes do curso e modulo
    var courseInfo = COURSE_MODULE_NAMES[cursoId] || { courseName: cursoId, courseCode: '', modules: {} };
    var courseName = courseInfo.courseName;
    var courseCode = courseInfo.courseCode;
    var moduleName = courseInfo.modules[modulo] || ('Modulo ' + modulo);

    var notaNum = parseFloat(nota);
    var notaColor = notaNum >= 70 ? '#27ae60' : notaNum >= 50 ? '#f39c12' : '#e74c3c';
    var notaMsg = notaNum >= 70 ? 'Aprovado! Parabens!' : notaNum >= 50 ? 'Em recuperacao. Continue estudando!' : 'Reprovado. Revise o conteudo e procure o professor.';

    var questoesHTML = '';
    questoes.forEach(function(q) {
      var bgColor = q.correta ? '#e8f5e9' : '#ffebee';
      var icon = q.correta ? '&#10004;' : '&#10008;';
      var iconColor = q.correta ? '#27ae60' : '#e74c3c';
      var respostaAlunoText = formatarResposta(q.respostaAluno);
      var respostaCorretaText = formatarResposta(q.respostaCorreta);
      questoesHTML += '<tr style="background-color:' + bgColor + '"><td style="padding:12px;border:1px solid #ddd;text-align:center;font-weight:bold"><span style="color:' + iconColor + ';font-size:18px">' + icon + '</span><br>Q' + q.numero + '</td><td style="padding:12px;border:1px solid #ddd"><strong>Sua resposta:</strong> ' + respostaAlunoText + '<br><strong>Resposta correta:</strong> ' + respostaCorretaText + '</td><td style="padding:12px;border:1px solid #ddd;font-style:italic;color:#555">' + (q.explicacao || '') + '</td></tr>';
    });

    var acertos = questoes.filter(function(q) { return q.correta; }).length;

    var html = '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Segoe UI,Tahoma,sans-serif"><div style="max-width:700px;margin:0 auto;background:white"><div style="background:linear-gradient(135deg,#1a5632,#2d8659);padding:30px;text-align:center"><h1 style="color:white;margin:0;font-size:22px">' + courseName + '</h1><p style="color:#c8e6c9;margin:5px 0 0;font-size:14px">Seminario Presbiteriano da Amazonia - ' + courseCode + '</p></div><div style="padding:25px 30px 10px"><p style="color:#333;font-size:16px;margin:0">Prezado(a) <strong>' + nomeAluno + '</strong>,</p><p style="color:#555;font-size:14px;margin-top:10px">Segue o resultado da sua prova do modulo <strong>' + moduleName + '</strong>, validada pelo professor.</p></div><div style="text-align:center;padding:20px;margin:0 30px;border-radius:12px;background:linear-gradient(135deg,' + notaColor + '15,' + notaColor + '25)"><div style="font-size:56px;font-weight:bold;color:' + notaColor + ';line-height:1">' + nota + '%</div><div style="font-size:14px;color:#666;margin-top:8px">' + acertos + ' de ' + questoes.length + ' questoes corretas</div><div style="font-size:16px;font-weight:bold;color:' + notaColor + ';margin-top:8px">' + notaMsg + '</div></div><div style="padding:25px 30px"><h2 style="color:#1a5632;font-size:18px;border-bottom:2px solid #1a5632;padding-bottom:8px">Detalhamento da Prova</h2><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="background:#1a5632"><th style="padding:10px;color:white;border:1px solid #ddd;width:60px">Questao</th><th style="padding:10px;color:white;border:1px solid #ddd">Respostas</th><th style="padding:10px;color:white;border:1px solid #ddd;width:200px">Explicacao</th></tr></thead><tbody>' + questoesHTML + '</tbody></table></div><div style="background:#f8f8f8;padding:20px 30px;text-align:center;border-top:1px solid #eee"><p style="color:#888;font-size:12px;margin:0">Email automatico do sistema ' + courseName + '.</p><p style="color:#aaa;font-size:11px;margin-top:10px">Procura apresentar-te a Deus aprovado... - 2 Timoteo 2:15</p></div></div></body></html>';

    var subject = '[' + courseName + '] Prova Modulo ' + modulo + ': ' + moduleName + ' - Nota: ' + nota + '%';
    GmailApp.sendEmail(email, subject, 'Sua nota no modulo ' + modulo + ' (' + moduleName + '): ' + nota + '% - ' + acertos + '/' + questoes.length + ' acertos', { htmlBody: html, name: courseName + ' - SPA' });
    return { success: true };
  } catch (err) {
    Logger.log('Erro ao enviar email: ' + err.message);
    return { success: false, error: err.message };
  }
}

function formatarResposta(resposta) {
  if (resposta === undefined || resposta === null) return '<em>Nao respondida</em>';
  if (typeof resposta === 'object' && !Array.isArray(resposta)) return Object.entries(resposta).map(function(e) { return e[0] + ': ' + e[1]; }).join(', ');
  if (Array.isArray(resposta)) return resposta.join(', ');
  return String(resposta);
}
