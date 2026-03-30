/**
 * Ingles Instrumental - Backend Google Apps Script
 * Roteamento principal de endpoints
 * Suporte a MULTIPLOS CURSOS
 *
 * DEPLOY: Extensions > Apps Script > Deploy > Web App
 * Execute as: Me | Who has access: Anyone
 */

// ========== CONFIGURACAO ==========
var SPREADSHEET_ID = '1B1CSrjvft1OV9pOJcVkcI5YZ8gKDBIOLEO-VK44Fwww';

function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getSheet(name) {
  return getSpreadsheet().getSheetByName(name);
}

// ========== CORS & ROUTING ==========

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;
    var result;

    switch (action) {
      // Auth
      case 'register':
        result = authRegister(body);
        break;
      case 'login':
        result = authLogin(body);
        break;
      case 'logout':
        result = authLogout(body);
        break;
      case 'checkSession':
        result = authCheckSession(body);
        break;
      case 'updatePhoto':
        result = authUpdatePhoto(body);
        break;
      case 'getAccess':
        result = getAccessConfig(body);
        break;

      // Courses
      case 'getCourses':
        result = coursesGetAll(body);
        break;
      case 'getEnrollments':
        result = coursesGetEnrollments(body);
        break;
      case 'enrollCourse':
        result = coursesEnroll(body);
        break;

      // Exams
      case 'submitExam':
        result = examSubmit(body);
        break;
      case 'getGrades':
        result = examGetGrades(body);
        break;
      case 'startExam':
        result = examStart(body);
        break;

      // Admin
      case 'adminLogin':
        result = adminLogin(body);
        break;
      case 'getStudents':
        result = adminGetStudents(body);
        break;
      case 'getAllGrades':
        result = adminGetAllGrades(body);
        break;
      case 'toggleModule':
        result = adminToggleModule(body);
        break;
      case 'validateGrade':
        result = adminValidateGrade(body);
        break;
      case 'updateInviteCode':
        result = adminUpdateInviteCode(body);
        break;
      case 'updateAdminPassword':
        result = adminUpdatePassword(body);
        break;
      case 'getConfig':
        result = adminGetConfig(body);
        break;

      default:
        result = { success: false, error: 'Acao desconhecida: ' + action };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Erro interno: ' + err.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: 'Ingles Instrumental API ativa'
  })).setMimeType(ContentService.MimeType.JSON);
}

// ========== UTILIDADES ==========

function hashPassword(password, salt) {
  var raw = salt + password;
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw, Utilities.Charset.UTF_8);
  return digest.map(function(b) { return ('0' + ((b < 0 ? b + 256 : b).toString(16))).slice(-2); }).join('');
}

function generateSalt() {
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var salt = '';
  for (var i = 0; i < 16; i++) {
    salt += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return salt;
}

function generateToken() {
  return Utilities.getUuid();
}

function findRowByEmail(sheet, email) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString().toLowerCase() === email.toLowerCase()) {
      return { row: i + 1, data: data[i] };
    }
  }
  return null;
}

function getConfigValue(key) {
  var sheet = getSheet('Config');
  var data = sheet.getDataRange().getValues();
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === key) {
      var val = data[i][1];
      // Google Sheets converte 'true'/'false' em booleanos TRUE/FALSE
      // Converter de volta para string para comparacoes consistentes
      if (val === true) return 'true';
      if (val === false) return 'false';
      return val;
    }
  }
  return null;
}

function setConfigValue(key, value) {
  var sheet = getSheet('Config');
  var data = sheet.getDataRange().getValues();
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  sheet.appendRow([key, value]);
}

// ========== HELPERS - CURSOS ==========

/**
 * Retorna informacoes de um curso pelo cursoId
 * Le a aba Cursos e retorna {cursoId, nome, codigo, numModulos, habilitado}
 */
function getCourseInfo(cursoId) {
  var sheet = getSheet('Cursos');
  if (!sheet) return null;
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === cursoId) {
      return {
        cursoId: data[i][0],
        nome: data[i][1],
        codigo: data[i][2],
        numModulos: data[i][3],
        habilitado: data[i][4] === true || data[i][4] === 'true'
      };
    }
  }
  return null;
}

/**
 * Retorna array de cursoIds em que o aluno esta inscrito
 * Le a aba Inscricoes filtrando por email e ativo=true
 */
function getStudentEnrollments(email) {
  var sheet = getSheet('Inscricoes');
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  var enrollments = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString().toLowerCase() === email.toLowerCase()) {
      var ativo = data[i][3];
      if (ativo === true || ativo === 'true') {
        enrollments.push(data[i][1]);
      }
    }
  }
  return enrollments;
}

// ========== ROTAS - CURSOS ==========

/**
 * Retorna todos os cursos habilitados
 */
function coursesGetAll(body) {
  var sheet = getSheet('Cursos');
  if (!sheet) {
    return { success: false, error: 'Aba Cursos nao encontrada. Execute migrateToMultiCourse().' };
  }
  var data = sheet.getDataRange().getValues();
  var courses = [];
  for (var i = 1; i < data.length; i++) {
    var habilitado = data[i][4];
    if (habilitado === true || habilitado === 'true') {
      courses.push({
        cursoId: data[i][0],
        nome: data[i][1],
        codigo: data[i][2],
        numModulos: data[i][3],
        habilitado: true
      });
    }
  }
  return { success: true, courses: courses };
}

/**
 * Retorna inscricoes do aluno (cursoIds + info do curso)
 * body: { token }
 */
function coursesGetEnrollments(body) {
  var token = body.token;
  if (!token) {
    return { success: false, error: 'Token obrigatorio' };
  }

  // Encontrar aluno pelo token
  var alunosSheet = getSheet('Alunos');
  var alunosData = alunosSheet.getDataRange().getValues();
  var email = null;
  for (var i = 1; i < alunosData.length; i++) {
    if (alunosData[i][6] === token) {
      email = alunosData[i][0];
      break;
    }
  }
  if (!email) {
    return { success: false, error: 'Sessao invalida' };
  }

  var cursoIds = getStudentEnrollments(email);
  var enrollments = [];
  for (var j = 0; j < cursoIds.length; j++) {
    var info = getCourseInfo(cursoIds[j]);
    if (info) {
      enrollments.push(info);
    }
  }
  return { success: true, enrollments: enrollments };
}

/**
 * Inscreve aluno em um curso
 * body: { token, cursoId, inviteCode }
 */
function coursesEnroll(body) {
  var token = body.token;
  var cursoId = body.cursoId;
  var inviteCode = body.inviteCode;

  if (!token || !cursoId) {
    return { success: false, error: 'Token e cursoId obrigatorios' };
  }

  // Encontrar aluno pelo token
  var alunosSheet = getSheet('Alunos');
  var alunosData = alunosSheet.getDataRange().getValues();
  var email = null;
  for (var i = 1; i < alunosData.length; i++) {
    if (alunosData[i][6] === token) {
      email = alunosData[i][0];
      break;
    }
  }
  if (!email) {
    return { success: false, error: 'Sessao invalida' };
  }

  // Verificar se o curso existe e esta habilitado
  var courseInfo = getCourseInfo(cursoId);
  if (!courseInfo) {
    return { success: false, error: 'Curso nao encontrado' };
  }
  if (!courseInfo.habilitado) {
    return { success: false, error: 'Curso nao esta habilitado' };
  }

  // Verificar codigo de convite do curso
  var expectedCode = getConfigValue(cursoId + '_inviteCode');
  if (expectedCode && inviteCode !== expectedCode) {
    return { success: false, error: 'Codigo de convite invalido' };
  }

  // Verificar se ja esta inscrito
  var existingEnrollments = getStudentEnrollments(email);
  for (var k = 0; k < existingEnrollments.length; k++) {
    if (existingEnrollments[k] === cursoId) {
      return { success: false, error: 'Voce ja esta inscrito neste curso' };
    }
  }

  // Inscrever
  var inscricoesSheet = getSheet('Inscricoes');
  inscricoesSheet.appendRow([email, cursoId, new Date().toISOString(), true]);

  return { success: true, message: 'Inscricao realizada com sucesso' };
}

// ========== SETUP INICIAL ==========
// Execute esta funcao UMA VEZ para criar as abas (estrutura multi-curso)
function setupSpreadsheet() {
  var ss = getSpreadsheet();

  // Aba Alunos
  var sheet = ss.getSheetByName('Alunos');
  if (!sheet) {
    sheet = ss.insertSheet('Alunos');
    sheet.appendRow(['email', 'nome', 'passwordHash', 'salt', 'turma', 'dataRegistro', 'sessionToken', 'tokenExpiry']);
    sheet.getRange(1, 1, 1, 8).setFontWeight('bold');
  }

  // Aba Notas (com coluna cursoId)
  sheet = ss.getSheetByName('Notas');
  if (!sheet) {
    sheet = ss.insertSheet('Notas');
    sheet.appendRow(['email', 'cursoId', 'modulo', 'nota', 'respostas', 'dataSubmissao', 'tempoGasto', 'validada', 'emailEnviado', 'dataValidacao']);
    sheet.getRange(1, 1, 1, 10).setFontWeight('bold');
  }

  // Aba Config (com chaves prefixadas por cursoId)
  sheet = ss.getSheetByName('Config');
  if (!sheet) {
    sheet = ss.insertSheet('Config');
    sheet.appendRow(['chave', 'valor']);
    sheet.getRange(1, 1, 1, 2).setFontWeight('bold');

    var salt = generateSalt();
    var adminHash = hashPassword('admin123', salt);

    var configs = [
      ['adminEmail', 'professor@email.com'],
      ['adminPasswordHash', adminHash],
      ['adminSalt', salt],
      ['adminSessionToken', ''],
      ['adminTokenExpiry', ''],
      // Ingles Instrumental - 8 modulos
      ['ingles_inviteCode', 'CG05-2026'],
      ['ingles_modulo1_conteudo', 'true'],
      ['ingles_modulo2_conteudo', 'false'],
      ['ingles_modulo3_conteudo', 'false'],
      ['ingles_modulo4_conteudo', 'false'],
      ['ingles_modulo5_conteudo', 'false'],
      ['ingles_modulo6_conteudo', 'false'],
      ['ingles_modulo7_conteudo', 'false'],
      ['ingles_modulo8_conteudo', 'false'],
      ['ingles_modulo1_prova', 'false'],
      ['ingles_modulo2_prova', 'false'],
      ['ingles_modulo3_prova', 'false'],
      ['ingles_modulo4_prova', 'false'],
      ['ingles_modulo5_prova', 'false'],
      ['ingles_modulo6_prova', 'false'],
      ['ingles_modulo7_prova', 'false'],
      ['ingles_modulo8_prova', 'false'],
      // Portugues 1 - 4 modulos
      ['portugues1_inviteCode', 'CG01-2026'],
      ['portugues1_modulo1_conteudo', 'false'],
      ['portugues1_modulo2_conteudo', 'false'],
      ['portugues1_modulo3_conteudo', 'false'],
      ['portugues1_modulo4_conteudo', 'false'],
      ['portugues1_modulo1_prova', 'false'],
      ['portugues1_modulo2_prova', 'false'],
      ['portugues1_modulo3_prova', 'false'],
      ['portugues1_modulo4_prova', 'false']
    ];
    for (var c = 0; c < configs.length; c++) {
      sheet.appendRow(configs[c]);
    }
  }

  // Aba Gabarito (com coluna cursoId)
  sheet = ss.getSheetByName('Gabarito');
  if (!sheet) {
    sheet = ss.insertSheet('Gabarito');
    sheet.appendRow(['cursoId', 'modulo', 'questao', 'tipo', 'respostaCorreta', 'explicacao']);
    sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
  }

  // Aba Cursos
  sheet = ss.getSheetByName('Cursos');
  if (!sheet) {
    sheet = ss.insertSheet('Cursos');
    sheet.appendRow(['cursoId', 'nome', 'codigo', 'numModulos', 'habilitado']);
    sheet.getRange(1, 1, 1, 5).setFontWeight('bold');
    sheet.appendRow(['ingles', 'Ingles Instrumental', 'CG05', 8, true]);
    sheet.appendRow(['portugues1', 'Portugues 1', 'CG01', 4, true]);
  }

  // Aba Inscricoes
  sheet = ss.getSheetByName('Inscricoes');
  if (!sheet) {
    sheet = ss.insertSheet('Inscricoes');
    sheet.appendRow(['email', 'cursoId', 'dataInscricao', 'ativo']);
    sheet.getRange(1, 1, 1, 4).setFontWeight('bold');
  }

  Logger.log('Setup concluido com sucesso!');
  Logger.log('Senha admin padrao: admin123');
  Logger.log('Codigo convite ingles: CG05-2026');
  Logger.log('Codigo convite portugues1: CG01-2026');
  Logger.log('ALTERE A SENHA E O EMAIL DO ADMIN na aba Config!');
}

// ========== MIGRACAO PARA MULTI-CURSO ==========
// Execute esta funcao UMA VEZ para migrar dados existentes
function migrateToMultiCourse() {
  var ss = getSpreadsheet();

  // 1. Criar aba Cursos
  var cursosSheet = ss.getSheetByName('Cursos');
  if (!cursosSheet) {
    cursosSheet = ss.insertSheet('Cursos');
    cursosSheet.appendRow(['cursoId', 'nome', 'codigo', 'numModulos', 'habilitado']);
    cursosSheet.getRange(1, 1, 1, 5).setFontWeight('bold');
  }
  // Verificar se os cursos ja existem antes de inserir
  var cursosData = cursosSheet.getDataRange().getValues();
  var cursosExistentes = {};
  for (var ci = 1; ci < cursosData.length; ci++) {
    cursosExistentes[cursosData[ci][0]] = true;
  }
  if (!cursosExistentes['ingles']) {
    cursosSheet.appendRow(['ingles', 'Ingles Instrumental', 'CG05', 8, true]);
  }
  if (!cursosExistentes['portugues1']) {
    cursosSheet.appendRow(['portugues1', 'Portugues 1', 'CG01', 4, true]);
  }
  Logger.log('Aba Cursos criada/atualizada.');

  // 2. Criar aba Inscricoes e inscrever alunos existentes no curso "ingles"
  var inscricoesSheet = ss.getSheetByName('Inscricoes');
  if (!inscricoesSheet) {
    inscricoesSheet = ss.insertSheet('Inscricoes');
    inscricoesSheet.appendRow(['email', 'cursoId', 'dataInscricao', 'ativo']);
    inscricoesSheet.getRange(1, 1, 1, 4).setFontWeight('bold');
  }

  var alunosSheet = ss.getSheetByName('Alunos');
  if (alunosSheet) {
    var alunosData = alunosSheet.getDataRange().getValues();
    var inscricoesData = inscricoesSheet.getDataRange().getValues();
    var jaInscritos = {};
    for (var ii = 1; ii < inscricoesData.length; ii++) {
      jaInscritos[inscricoesData[ii][0] + '|' + inscricoesData[ii][1]] = true;
    }
    var agora = new Date().toISOString();
    for (var ai = 1; ai < alunosData.length; ai++) {
      var emailAluno = alunosData[ai][0];
      if (emailAluno && !jaInscritos[emailAluno + '|ingles']) {
        inscricoesSheet.appendRow([emailAluno, 'ingles', agora, true]);
      }
    }
    Logger.log('Alunos existentes inscritos no curso ingles.');
  }

  // 3. Migrar Config: renomear chaves modulo{N} para ingles_modulo{N}
  var configSheet = ss.getSheetByName('Config');
  if (configSheet) {
    var configData = configSheet.getDataRange().getValues();
    for (var cfi = 0; cfi < configData.length; cfi++) {
      var chave = configData[cfi][0];
      if (!chave) continue;
      // Renomear modulo{N}_conteudo e modulo{N}_prova
      var matchModulo = chave.match(/^modulo(\d+)_(conteudo|prova)$/);
      if (matchModulo) {
        var novaChave = 'ingles_' + chave;
        configSheet.getRange(cfi + 1, 1).setValue(novaChave);
        Logger.log('Config renomeada: ' + chave + ' -> ' + novaChave);
      }
      // Renomear inviteCode
      if (chave === 'inviteCode') {
        configSheet.getRange(cfi + 1, 1).setValue('ingles_inviteCode');
        Logger.log('Config renomeada: inviteCode -> ingles_inviteCode');
      }
    }

    // Adicionar chaves para portugues1
    for (var pm = 1; pm <= 4; pm++) {
      var chaveConteudo = 'portugues1_modulo' + pm + '_conteudo';
      var chaveProva = 'portugues1_modulo' + pm + '_prova';
      if (getConfigValue(chaveConteudo) === null) {
        configSheet.appendRow([chaveConteudo, 'false']);
      }
      if (getConfigValue(chaveProva) === null) {
        configSheet.appendRow([chaveProva, 'false']);
      }
    }
    if (getConfigValue('portugues1_inviteCode') === null) {
      configSheet.appendRow(['portugues1_inviteCode', 'CG01-2026']);
    }
    Logger.log('Config atualizada com chaves para portugues1.');
  }

  // 4. Migrar Notas: inserir coluna B com "ingles" para todas as linhas existentes
  var notasSheet = ss.getSheetByName('Notas');
  if (notasSheet) {
    var notasData = notasSheet.getDataRange().getValues();
    var numRows = notasData.length;
    var numCols = notasData[0].length;
    if (numRows > 0 && notasData[0][1] !== 'cursoId') {
      // Inserir coluna na posicao B (coluna 2)
      notasSheet.insertColumnAfter(1);
      // Header
      notasSheet.getRange(1, 2).setValue('cursoId');
      // Preencher com "ingles" para todas as linhas de dados
      for (var ni = 2; ni <= numRows; ni++) {
        notasSheet.getRange(ni, 2).setValue('ingles');
      }
      Logger.log('Notas: coluna cursoId inserida com valor "ingles" para ' + (numRows - 1) + ' linhas.');
    } else {
      Logger.log('Notas: coluna cursoId ja existe, pulando.');
    }
  }

  // 5. Migrar Gabarito: inserir coluna A com "ingles" para todas as linhas existentes
  var gabaritoSheet = ss.getSheetByName('Gabarito');
  if (gabaritoSheet) {
    var gabaritoData = gabaritoSheet.getDataRange().getValues();
    var gabNumRows = gabaritoData.length;
    if (gabNumRows > 0 && gabaritoData[0][0] !== 'cursoId') {
      // Inserir coluna na posicao A (coluna 1)
      gabaritoSheet.insertColumnBefore(1);
      // Header
      gabaritoSheet.getRange(1, 1).setValue('cursoId');
      // Preencher com "ingles" para todas as linhas de dados
      for (var gi = 2; gi <= gabNumRows; gi++) {
        gabaritoSheet.getRange(gi, 1).setValue('ingles');
      }
      Logger.log('Gabarito: coluna cursoId inserida com valor "ingles" para ' + (gabNumRows - 1) + ' linhas.');
    } else {
      Logger.log('Gabarito: coluna cursoId ja existe, pulando.');
    }
  }

  Logger.log('Migracao para multi-curso concluida!');
}

// ========== POPULATE GABARITO ==========
// Nota: esta funcao precisara ser atualizada para incluir cursoId
function populateGabarito() {
  // TODO: atualizar para receber cursoId como parametro
  // e inserir na coluna A da aba Gabarito
  Logger.log('populateGabarito precisa ser atualizado para suporte multi-curso.');
}
