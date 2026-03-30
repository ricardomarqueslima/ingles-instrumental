/**
 * Auth.gs - Registro, Login, Sessao de Alunos e Gestao de Cursos
 * Coluna I (9) = foto (base64)
 *
 * Abas referenciadas:
 *   Alunos:     email(0), nome(1), hash(2), salt(3), turma(4), data(5), token(6), expiry(7), foto(8)
 *   Inscricoes: email(0), cursoId(1), dataInscricao(2), ativo(3)
 *   Cursos:     cursoId(0), nome(1), codigo(2), numModulos(3), habilitado(4)
 *   Config:     chave(0), valor(1)
 *   Notas:      email(0), cursoId(1), modulo(2), nota(3), respostas(4), data(5), tempo(6), validada(7), emailEnviado(8), dataValidacao(9)
 */

// ========== REGISTRO ==========

function authRegister(body) {
  var nome = body.nome;
  var email = body.email;
  var password = body.password;
  var inviteCode = body.inviteCode;
  var foto = body.foto;

  if (!nome || !email || !password || !inviteCode) {
    return { success: false, error: 'Todos os campos sao obrigatorios.' };
  }

  if (password.length < 6) {
    return { success: false, error: 'A senha deve ter pelo menos 6 caracteres.' };
  }

  var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, error: 'Email invalido.' };
  }

  // Verificar codigo convite em todos os cursos
  var cursosSheet = getSheet('Cursos');
  var cursosData = cursosSheet.getDataRange().getValues();
  var matchedCourses = [];

  var configSheet = getSheet('Config');
  var configData = configSheet.getDataRange().getValues();

  for (var c = 1; c < cursosData.length; c++) {
    var cursoId = cursosData[c][0];
    var habilitado = cursosData[c][4];
    if (!cursoId || habilitado === false || habilitado === 'false' || habilitado === 'FALSE') continue;

    // Procurar chave {cursoId}_inviteCode na Config
    var configKey = cursoId + '_inviteCode';
    var configVal = null;
    for (var k = 0; k < configData.length; k++) {
      if (configData[k][0] === configKey) {
        configVal = configData[k][1];
        if (configVal === true) configVal = 'true';
        if (configVal === false) configVal = 'false';
        break;
      }
    }

    if (configVal && inviteCode.trim() === configVal.toString().trim()) {
      matchedCourses.push(cursoId);
    }
  }

  if (matchedCourses.length === 0) {
    return { success: false, error: 'Codigo de convite invalido.' };
  }

  // Verificar se email ja cadastrado
  var sheet = getSheet('Alunos');
  var existing = findRowByEmail(sheet, email);
  if (existing) {
    return { success: false, error: 'Este email ja esta cadastrado.' };
  }

  // Criar conta
  var salt = generateSalt();
  var hash = hashPassword(password, salt);
  var token = generateToken();
  var expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

  var normalizedEmail = email.toLowerCase().trim();

  sheet.appendRow([
    normalizedEmail,
    nome.trim(),
    hash,
    salt,
    inviteCode.trim(),
    new Date(),
    token,
    expiry,
    foto || '' // coluna I = foto
  ]);

  // Auto-inscrever o aluno nos cursos correspondentes
  var inscricoesSheet = getSheet('Inscricoes');
  for (var m = 0; m < matchedCourses.length; m++) {
    inscricoesSheet.appendRow([
      normalizedEmail,
      matchedCourses[m],
      new Date(),
      true
    ]);
  }

  return {
    success: true,
    data: {
      token: token,
      nome: nome.trim(),
      email: normalizedEmail,
      foto: foto || ''
    }
  };
}

// ========== LOGIN ==========

function authLogin(body) {
  var email = body.email;
  var password = body.password;

  if (!email || !password) {
    return { success: false, error: 'Email e senha sao obrigatorios.' };
  }

  var sheet = getSheet('Alunos');
  var result = findRowByEmail(sheet, email);

  if (!result) {
    return { success: false, error: 'Email ou senha incorretos.' };
  }

  var storedHash = result.data[2]; // passwordHash
  var salt = result.data[3];       // salt
  var computedHash = hashPassword(password, salt);

  if (computedHash !== storedHash) {
    return { success: false, error: 'Email ou senha incorretos.' };
  }

  // Gerar novo token
  var token = generateToken();
  var expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

  sheet.getRange(result.row, 7).setValue(token);       // sessionToken
  sheet.getRange(result.row, 8).setValue(expiry);       // tokenExpiry

  return {
    success: true,
    data: {
      token: token,
      nome: result.data[1],
      email: result.data[0],
      foto: result.data[8] || '' // coluna I
    }
  };
}

// ========== LOGOUT ==========

function authLogout(body) {
  var token = body.token;
  if (!token) return { success: false, error: 'Token nao informado.' };

  var sheet = getSheet('Alunos');
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][6] === token) {
      sheet.getRange(i + 1, 7).setValue('');
      sheet.getRange(i + 1, 8).setValue('');
      return { success: true };
    }
  }

  return { success: true };
}

// ========== CHECK SESSION ==========

function authCheckSession(body) {
  var token = body.token;
  if (!token) return { success: false, error: 'Token nao informado.' };

  var sheet = getSheet('Alunos');
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][6] === token) {
      var expiry = new Date(data[i][7]);
      if (expiry > new Date()) {
        return {
          success: true,
          data: {
            nome: data[i][1],
            email: data[i][0],
            foto: data[i][8] || '' // coluna I
          }
        };
      } else {
        // Token expirado
        sheet.getRange(i + 1, 7).setValue('');
        sheet.getRange(i + 1, 8).setValue('');
        return { success: false, error: 'Sessao expirada. Faca login novamente.' };
      }
    }
  }

  return { success: false, error: 'Sessao invalida.' };
}

// ========== UPDATE PHOTO ==========

function authUpdatePhoto(body) {
  var token = body.token;
  var foto = body.foto;

  var session = authCheckSession(body);
  if (!session.success) return session;

  if (!foto) return { success: false, error: 'Nenhuma foto enviada.' };

  var sheet = getSheet('Alunos');
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString().toLowerCase() === session.data.email.toLowerCase()) {
      sheet.getRange(i + 1, 9).setValue(foto); // coluna I
      return { success: true };
    }
  }

  return { success: false, error: 'Aluno nao encontrado.' };
}

// ========== GET ACCESS CONFIG ==========

function getAccessConfig(body) {
  var token = body.token;
  var cursoId = body.cursoId;

  // Validar sessao
  var session = authCheckSession(body);
  if (!session.success) return session;

  var config = {};
  var courseInfo = null;
  var numModulos = 8; // padrao se nao especificar curso

  if (cursoId) {
    // Buscar info do curso na aba Cursos
    var cursosSheet = getSheet('Cursos');
    var cursosData = cursosSheet.getDataRange().getValues();
    for (var c = 1; c < cursosData.length; c++) {
      if (cursosData[c][0] === cursoId) {
        courseInfo = {
          nome: cursosData[c][1],
          numModulos: cursosData[c][3]
        };
        numModulos = parseInt(cursosData[c][3], 10) || 8;
        break;
      }
    }

    if (!courseInfo) {
      return { success: false, error: 'Curso nao encontrado.' };
    }

    // Chaves com prefixo do curso
    for (var m = 1; m <= numModulos; m++) {
      config['modulo' + m + '_conteudo'] = getConfigValue(cursoId + '_modulo' + m + '_conteudo') === 'true';
      config['modulo' + m + '_prova'] = getConfigValue(cursoId + '_modulo' + m + '_prova') === 'true';
    }
  } else {
    // Fallback sem curso (compatibilidade)
    for (var m2 = 1; m2 <= numModulos; m2++) {
      config['modulo' + m2 + '_conteudo'] = getConfigValue('modulo' + m2 + '_conteudo') === 'true';
      config['modulo' + m2 + '_prova'] = getConfigValue('modulo' + m2 + '_prova') === 'true';
    }
  }

  // Pegar notas do aluno
  var notasSheet = getSheet('Notas');
  var notasData = notasSheet.getDataRange().getValues();
  var grades = {};

  for (var i = 1; i < notasData.length; i++) {
    if (notasData[i][0] && notasData[i][0].toString().toLowerCase() === session.data.email.toLowerCase()) {
      // Notas: email(0), cursoId(1), modulo(2), nota(3), respostas(4), data(5), tempo(6), validada(7)
      var notaCursoId = notasData[i][1];
      var notaModulo = notasData[i][2];

      // Filtrar por cursoId se fornecido
      if (cursoId && notaCursoId !== cursoId) continue;

      grades['modulo' + notaModulo] = {
        nota: notasData[i][3],
        validada: notasData[i][7] === true || notasData[i][7] === 'TRUE',
        data: notasData[i][5]
      };
    }
  }

  var responseData = {
    access: config,
    grades: grades
  };

  if (courseInfo) {
    responseData.courseInfo = courseInfo;
  }

  return {
    success: true,
    data: responseData
  };
}

// ========== COURSES: GET ALL ==========

function coursesGetAll(body) {
  var cursosSheet = getSheet('Cursos');
  var cursosData = cursosSheet.getDataRange().getValues();
  var courses = [];

  for (var i = 1; i < cursosData.length; i++) {
    var habilitado = cursosData[i][4];
    if (habilitado === true || habilitado === 'true' || habilitado === 'TRUE') {
      courses.push({
        cursoId: cursosData[i][0],
        nome: cursosData[i][1],
        codigo: cursosData[i][2],
        numModulos: cursosData[i][3]
      });
    }
  }

  return {
    success: true,
    data: courses
  };
}

// ========== COURSES: GET ENROLLMENTS ==========

function coursesGetEnrollments(body) {
  var session = authCheckSession(body);
  if (!session.success) return session;

  var inscricoesSheet = getSheet('Inscricoes');
  var inscricoesData = inscricoesSheet.getDataRange().getValues();
  var enrollments = [];

  for (var i = 1; i < inscricoesData.length; i++) {
    if (inscricoesData[i][0] && inscricoesData[i][0].toString().toLowerCase() === session.data.email.toLowerCase()) {
      var ativo = inscricoesData[i][3];
      if (ativo === true || ativo === 'true' || ativo === 'TRUE') {
        enrollments.push({
          cursoId: inscricoesData[i][1],
          dataInscricao: inscricoesData[i][2]
        });
      }
    }
  }

  return {
    success: true,
    data: enrollments
  };
}

// ========== COURSES: ENROLL ==========

function coursesEnroll(body) {
  var session = authCheckSession(body);
  if (!session.success) return session;

  var inviteCode = body.inviteCode;
  if (!inviteCode) {
    return { success: false, error: 'Codigo de convite obrigatorio.' };
  }

  // Buscar qual curso corresponde ao inviteCode
  var cursosSheet = getSheet('Cursos');
  var cursosData = cursosSheet.getDataRange().getValues();
  var configSheet = getSheet('Config');
  var configData = configSheet.getDataRange().getValues();
  var matchedCourses = [];

  for (var c = 1; c < cursosData.length; c++) {
    var cursoId = cursosData[c][0];
    var habilitado = cursosData[c][4];
    if (!cursoId || habilitado === false || habilitado === 'false' || habilitado === 'FALSE') continue;

    var configKey = cursoId + '_inviteCode';
    var configVal = null;
    for (var k = 0; k < configData.length; k++) {
      if (configData[k][0] === configKey) {
        configVal = configData[k][1];
        if (configVal === true) configVal = 'true';
        if (configVal === false) configVal = 'false';
        break;
      }
    }

    if (configVal && inviteCode.trim() === configVal.toString().trim()) {
      matchedCourses.push(cursoId);
    }
  }

  if (matchedCourses.length === 0) {
    return { success: false, error: 'Codigo de convite invalido.' };
  }

  // Verificar inscricoes existentes e inscrever nos cursos novos
  var inscricoesSheet = getSheet('Inscricoes');
  var inscricoesData = inscricoesSheet.getDataRange().getValues();
  var existingEnrollments = {};

  for (var i = 1; i < inscricoesData.length; i++) {
    if (inscricoesData[i][0] && inscricoesData[i][0].toString().toLowerCase() === session.data.email.toLowerCase()) {
      existingEnrollments[inscricoesData[i][1]] = true;
    }
  }

  var enrolled = [];
  for (var m = 0; m < matchedCourses.length; m++) {
    if (!existingEnrollments[matchedCourses[m]]) {
      inscricoesSheet.appendRow([
        session.data.email.toLowerCase(),
        matchedCourses[m],
        new Date(),
        true
      ]);
      enrolled.push(matchedCourses[m]);
    }
  }

  if (enrolled.length === 0) {
    return { success: false, error: 'Voce ja esta inscrito neste(s) curso(s).' };
  }

  return {
    success: true,
    data: {
      enrolled: enrolled
    }
  };
}
