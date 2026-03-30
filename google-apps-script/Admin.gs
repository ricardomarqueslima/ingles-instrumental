/**
 * Admin.gs - Endpoints do Painel do Professor (Multi-Curso)
 *
 * Abas: Alunos, Notas(+cursoId), Config, Cursos, Inscricoes, Gabarito(+cursoId)
 */

function adminLogin(body) {
  var email = body.email, password = body.password;
  if (!email || !password) return { success: false, error: 'Email e senha sao obrigatorios.' };
  var adminEmail = getConfigValue('adminEmail');
  if (email.toLowerCase().trim() !== adminEmail.toLowerCase().trim()) return { success: false, error: 'Credenciais invalidas.' };
  var adminSalt = getConfigValue('adminSalt');
  var adminHash = getConfigValue('adminPasswordHash');
  var computedHash = hashPassword(password, adminSalt);
  if (computedHash !== adminHash) return { success: false, error: 'Credenciais invalidas.' };
  var token = generateToken();
  var expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
  setConfigValue('adminSessionToken', token);
  setConfigValue('adminTokenExpiry', expiry.toISOString());
  return { success: true, data: { token: token, email: adminEmail } };
}

function verifyAdmin(token) {
  if (!token) return false;
  var storedToken = getConfigValue('adminSessionToken');
  var expiryStr = getConfigValue('adminTokenExpiry');
  if (token !== storedToken) return false;
  if (!expiryStr) return false;
  return new Date(expiryStr) > new Date();
}

function adminGetStudents(body) {
  var adminToken = body.adminToken;
  if (!verifyAdmin(adminToken)) return { success: false, error: 'Acesso negado.' };

  var sheet = getSheet('Alunos');
  var data = sheet.getDataRange().getValues();
  var notasSheet = getSheet('Notas');
  var notasData = notasSheet.getDataRange().getValues();
  var inscSheet = getSheet('Inscricoes');
  var inscData = inscSheet ? inscSheet.getDataRange().getValues() : [];

  var students = [];
  for (var i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    var email = data[i][0].toString().toLowerCase();

    // Contar provas feitas
    var provasFeitas = 0;
    for (var j = 1; j < notasData.length; j++) {
      if (notasData[j][0] && notasData[j][0].toString().toLowerCase() === email) provasFeitas++;
    }

    // Listar cursos inscritos
    var cursos = [];
    for (var k = 1; k < inscData.length; k++) {
      if (inscData[k][0] && inscData[k][0].toString().toLowerCase() === email && inscData[k][3] !== false) {
        cursos.push(inscData[k][1]);
      }
    }

    students.push({
      email: email,
      nome: data[i][1],
      turma: data[i][4],
      dataRegistro: data[i][5],
      provasFeitas: provasFeitas,
      cursos: cursos
    });
  }
  return { success: true, data: students };
}

function adminGetAllGrades(body) {
  var adminToken = body.adminToken;
  var cursoIdFilter = body.cursoId || null;
  if (!verifyAdmin(adminToken)) return { success: false, error: 'Acesso negado.' };

  var notasSheet = getSheet('Notas');
  var notasData = notasSheet.getDataRange().getValues();
  var alunosSheet = getSheet('Alunos');
  var alunosData = alunosSheet.getDataRange().getValues();
  var nomes = {};
  for (var i = 1; i < alunosData.length; i++) {
    if (alunosData[i][0]) nomes[alunosData[i][0].toString().toLowerCase()] = alunosData[i][1];
  }

  var grades = [];
  // Notas: email(0), cursoId(1), modulo(2), nota(3), respostas(4), data(5), tempo(6), validada(7), emailEnviado(8), dataValidacao(9)
  for (var j = 1; j < notasData.length; j++) {
    if (!notasData[j][0]) continue;
    var email = notasData[j][0].toString().toLowerCase();
    var cursoId = notasData[j][1] || 'ingles';
    if (cursoIdFilter && cursoId !== cursoIdFilter) continue;

    grades.push({
      email: email,
      nome: nomes[email] || email,
      cursoId: cursoId,
      modulo: notasData[j][2],
      nota: notasData[j][3],
      respostas: notasData[j][4],
      data: notasData[j][5],
      tempoGasto: notasData[j][6],
      validada: notasData[j][7] === true || notasData[j][7] === 'TRUE',
      emailEnviado: notasData[j][8] === true || notasData[j][8] === 'TRUE',
      dataValidacao: notasData[j][9]
    });
  }
  return { success: true, data: grades };
}

function adminToggleModule(body) {
  var adminToken = body.adminToken;
  var cursoId = body.cursoId;
  var modulo = body.modulo;
  var tipo = body.tipo;
  var habilitado = body.habilitado;
  if (!verifyAdmin(adminToken)) return { success: false, error: 'Acesso negado.' };
  if (!cursoId) return { success: false, error: 'cursoId obrigatorio.' };
  if (!modulo || modulo < 1) return { success: false, error: 'Modulo invalido.' };
  if (tipo !== 'conteudo' && tipo !== 'prova') return { success: false, error: 'Tipo deve ser conteudo ou prova.' };

  var key = cursoId + '_modulo' + modulo + '_' + tipo;
  setConfigValue(key, habilitado ? 'true' : 'false');
  return { success: true, data: { key: key, valor: habilitado } };
}

function adminValidateGrade(body) {
  var adminToken = body.adminToken;
  var email = body.email;
  var modulo = body.modulo;
  var cursoId = body.cursoId || 'ingles';
  if (!verifyAdmin(adminToken)) return { success: false, error: 'Acesso negado.' };

  var notasSheet = getSheet('Notas');
  var data = notasSheet.getDataRange().getValues();
  // Notas: email(0), cursoId(1), modulo(2), nota(3), ...
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString().toLowerCase() === email.toLowerCase()
        && (data[i][1] || 'ingles') === cursoId
        && data[i][2] == modulo) {
      notasSheet.getRange(i + 1, 8).setValue(true);   // validada (col H = 8)
      notasSheet.getRange(i + 1, 10).setValue(new Date()); // dataValidacao (col J = 10)
      var resultado = enviarEmailNota(email, cursoId, modulo, data[i][3], data[i][4]);
      if (resultado.success) notasSheet.getRange(i + 1, 9).setValue(true); // emailEnviado (col I = 9)
      return { success: true, data: { email: email, cursoId: cursoId, modulo: modulo, nota: data[i][3], emailEnviado: resultado.success } };
    }
  }
  return { success: false, error: 'Nota nao encontrada para este aluno/curso/modulo.' };
}

function adminUpdateInviteCode(body) {
  var adminToken = body.adminToken;
  var cursoId = body.cursoId || 'ingles';
  var newCode = body.newCode;
  if (!verifyAdmin(adminToken)) return { success: false, error: 'Acesso negado.' };
  if (!newCode || newCode.trim().length < 3) return { success: false, error: 'Codigo deve ter pelo menos 3 caracteres.' };
  var key = cursoId + '_inviteCode';
  setConfigValue(key, newCode.trim());
  return { success: true, data: { cursoId: cursoId, inviteCode: newCode.trim() } };
}

function adminUpdatePassword(body) {
  var adminToken = body.adminToken;
  var newPassword = body.newPassword;
  if (!verifyAdmin(adminToken)) return { success: false, error: 'Acesso negado.' };
  if (!newPassword || newPassword.length < 6) return { success: false, error: 'Senha deve ter pelo menos 6 caracteres.' };
  var salt = generateSalt();
  var hash = hashPassword(newPassword, salt);
  setConfigValue('adminSalt', salt);
  setConfigValue('adminPasswordHash', hash);
  return { success: true };
}

function adminGetConfig(body) {
  var adminToken = body.adminToken;
  if (!verifyAdmin(adminToken)) return { success: false, error: 'Acesso negado.' };

  // Carregar todos os cursos
  var cursosSheet = getSheet('Cursos');
  var cursosData = cursosSheet ? cursosSheet.getDataRange().getValues() : [];
  var courses = [];
  for (var c = 1; c < cursosData.length; c++) {
    if (!cursosData[c][0]) continue;
    courses.push({
      cursoId: cursosData[c][0],
      nome: cursosData[c][1],
      codigo: cursosData[c][2],
      numModulos: parseInt(cursosData[c][3], 10) || 0,
      habilitado: cursosData[c][4] === true || cursosData[c][4] === 'true' || cursosData[c][4] === 'TRUE'
    });
  }

  // Carregar config por curso
  var config = {
    adminEmail: getConfigValue('adminEmail'),
    courses: courses
  };

  for (var i = 0; i < courses.length; i++) {
    var cid = courses[i].cursoId;
    var nm = courses[i].numModulos;
    config[cid] = { inviteCode: getConfigValue(cid + '_inviteCode') || '' };
    for (var m = 1; m <= nm; m++) {
      config[cid]['modulo' + m + '_conteudo'] = getConfigValue(cid + '_modulo' + m + '_conteudo') === 'true';
      config[cid]['modulo' + m + '_prova'] = getConfigValue(cid + '_modulo' + m + '_prova') === 'true';
    }
  }

  return { success: true, data: config };
}

function adminGetCourses(body) {
  var adminToken = body.adminToken;
  if (!verifyAdmin(adminToken)) return { success: false, error: 'Acesso negado.' };

  var cursosSheet = getSheet('Cursos');
  if (!cursosSheet) return { success: true, data: [] };
  var data = cursosSheet.getDataRange().getValues();
  var courses = [];
  for (var i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    courses.push({
      cursoId: data[i][0],
      nome: data[i][1],
      codigo: data[i][2],
      numModulos: parseInt(data[i][3], 10) || 0,
      habilitado: data[i][4] === true || data[i][4] === 'true' || data[i][4] === 'TRUE'
    });
  }
  return { success: true, data: courses };
}
