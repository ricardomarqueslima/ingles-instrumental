/**
 * admin.js - Logica do Painel Administrativo (Multi-Curso)
 */

var Admin = {
  token: null,
  config: null,
  students: [],
  grades: [],
  courses: [],
  selectedCourse: 'all',

  init: function() {
    this.token = localStorage.getItem('adminToken');
    if (this.token) this.loadDashboard();
  },

  async handleLogin(e) {
    e.preventDefault();
    var email = document.getElementById('adminEmail').value.trim();
    var password = document.getElementById('adminPassword').value;
    var errorEl = document.getElementById('adminLoginError');
    if (!email || !password) { errorEl.textContent = 'Preencha todos os campos.'; return; }
    errorEl.textContent = '';
    var result = await API.adminLogin(email, password);
    if (result.success) {
      this.token = result.data.token;
      localStorage.setItem('adminToken', this.token);
      this.loadDashboard();
    } else {
      errorEl.textContent = result.error || 'Erro ao fazer login.';
    }
  },

  handleLogout: function() {
    localStorage.removeItem('adminToken');
    this.token = null;
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('dashboard').style.display = 'none';
  },

  async loadDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';

    var configRes = await API.getConfig();
    var studentsRes = await API.getStudents(this.selectedCourse);
    var gradesRes = await API.getAllGrades();

    if (!configRes.success) {
      alert('Sessao expirada. Faca login novamente.');
      this.handleLogout();
      return;
    }

    this.config = configRes.data;
    this.courses = configRes.data.courses || [];
    this.students = studentsRes.success ? studentsRes.data : [];
    this.grades = gradesRes.success ? gradesRes.data : [];

    this.renderCourseSelector();
    this.renderStats();
    this.renderModuleGrid();
    this.renderStudentsTable();
    this.renderGradesTable();
    this.renderSettings();
  },

  renderCourseSelector: function() {
    var selector = document.getElementById('courseSelector');
    if (!selector) return;
    selector.innerHTML = '<option value="all">Todos os Cursos</option>';
    for (var i = 0; i < this.courses.length; i++) {
      var c = this.courses[i];
      selector.innerHTML += '<option value="' + c.cursoId + '"' + (this.selectedCourse === c.cursoId ? ' selected' : '') + '>' + c.nome + ' (' + c.codigo + ')</option>';
    }
  },

  async selectCourse(cursoId) {
    this.selectedCourse = cursoId;
    
    var studentsRes = await API.getStudents(this.selectedCourse);
    this.students = studentsRes.success ? studentsRes.data : [];
    
    this.renderStats();
    this.renderModuleGrid();
    this.renderStudentsTable();
    this.renderGradesTable();
    this.renderSettings();
  },

  renderStats: function() {
    document.getElementById('statStudents').textContent = this.students.length;

    var filteredGrades = this.selectedCourse === 'all' ? this.grades : this.grades.filter(function(g) { return g.cursoId === Admin.selectedCourse; });

    document.getElementById('statExams').textContent = filteredGrades.length;
    var pending = filteredGrades.filter(function(g) { return !g.validada; }).length;
    document.getElementById('statPending').textContent = pending;
    var avg = filteredGrades.length > 0
      ? Math.round(filteredGrades.reduce(function(sum, g) { return sum + (g.nota || 0); }, 0) / filteredGrades.length)
      : 0;
    document.getElementById('statAverage').textContent = avg + '%';
  },

  renderModuleGrid: function() {
    var grid = document.getElementById('moduleGrid');
    if (!grid) return;
    grid.innerHTML = '';

    var coursesToRender = this.selectedCourse === 'all' ? this.courses : this.courses.filter(function(c) { return c.cursoId === Admin.selectedCourse; });

    for (var ci = 0; ci < coursesToRender.length; ci++) {
      var course = coursesToRender[ci];
      var cid = course.cursoId;
      var courseConfig = this.config[cid] || {};

      if (coursesToRender.length > 1) {
        var header = document.createElement('h3');
        header.style.cssText = 'grid-column:1/-1;color:var(--primary);margin-top:20px;padding-bottom:8px;border-bottom:2px solid var(--border);';
        header.textContent = course.nome + ' (' + course.codigo + ')';
        grid.appendChild(header);
      }

      for (var m = 1; m <= course.numModulos; m++) {
        var contentOn = courseConfig['modulo' + m + '_conteudo'] || false;
        var provaOn = courseConfig['modulo' + m + '_prova'] || false;
        var examsForModule = this.grades.filter(function(g) { return g.cursoId === cid && g.modulo == m; });

        var card = document.createElement('div');
        card.className = 'module-card';
        card.innerHTML =
          '<div class="module-card-header">' +
            '<span class="module-num">' + m + '</span>' +
            '<span class="module-name">M\u00f3dulo ' + m + '</span>' +
          '</div>' +
          '<div class="module-card-body">' +
            '<div class="toggle-row"><span>Conte\u00fado</span><label class="toggle"><input type="checkbox" ' + (contentOn ? 'checked' : '') + ' onchange="Admin.toggleModule(\'' + cid + '\',' + m + ',\'conteudo\',this.checked)"><span class="toggle-slider"></span></label></div>' +
            '<div class="toggle-row"><span>Prova</span><label class="toggle"><input type="checkbox" ' + (provaOn ? 'checked' : '') + ' onchange="Admin.toggleModule(\'' + cid + '\',' + m + ',\'prova\',this.checked)"><span class="toggle-slider"></span></label></div>' +
            '<div class="module-stat">' + examsForModule.length + ' prova(s) realizada(s)</div>' +
          '</div>';
        grid.appendChild(card);
      }
    }
  },

  async toggleModule(cursoId, modulo, tipo, habilitado) {
    var result = await API.toggleModule(cursoId, modulo, tipo, habilitado);
    if (result.success) {
      if (this.config[cursoId]) {
        this.config[cursoId]['modulo' + modulo + '_' + tipo] = habilitado;
      }
    } else {
      alert(result.error || 'Erro ao alterar modulo.');
      this.loadDashboard();
    }
  },

  renderStudentsTable: function() {
    var tbody = document.getElementById('studentsBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (this.students.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-msg">Nenhum aluno cadastrado.</td></tr>';
      return;
    }
    for (var i = 0; i < this.students.length; i++) {
      var s = this.students[i];
      var date = s.dataRegistro ? new Date(s.dataRegistro).toLocaleDateString('pt-BR') : '-';
      var cursos = s.cursos || '-';
      var tr = document.createElement('tr');
      tr.innerHTML = '<td>' + s.nome + '</td><td>' + s.email + '</td><td>' + cursos + '</td><td>' + date + '</td><td>' + s.provasFeitas + '</td>';
      tbody.appendChild(tr);
    }
  },

  renderGradesTable: function() {
    var tbody = document.getElementById('gradesBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    var filterModule = document.getElementById('filterModule');
    var filterStatus = document.getElementById('filterStatus');
    var fMod = filterModule ? filterModule.value : 'all';
    var fStat = filterStatus ? filterStatus.value : 'all';

    var filtered = this.grades.slice();
    if (this.selectedCourse !== 'all') filtered = filtered.filter(function(g) { return g.cursoId === Admin.selectedCourse; });
    if (fMod !== 'all') filtered = filtered.filter(function(g) { return g.modulo == fMod; });
    if (fStat === 'pending') filtered = filtered.filter(function(g) { return !g.validada; });
    else if (fStat === 'validated') filtered = filtered.filter(function(g) { return g.validada; });

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="empty-msg">Nenhuma nota encontrada.</td></tr>';
      return;
    }

    filtered.sort(function(a, b) { return a.validada === b.validada ? 0 : a.validada ? 1 : -1; });

    for (var i = 0; i < filtered.length; i++) {
      var g = filtered[i];
      var date = g.data ? new Date(g.data).toLocaleDateString('pt-BR') : '-';
      var tempo = g.tempoGasto ? Math.floor(g.tempoGasto / 60) + 'min' : '-';
      var notaClass = g.nota >= 70 ? 'nota-good' : g.nota >= 50 ? 'nota-avg' : 'nota-bad';
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + g.nome + '</td>' +
        '<td>' + (g.cursoId || 'ingles') + ' - M' + g.modulo + '</td>' +
        '<td class="' + notaClass + '">' + g.nota + '%</td>' +
        '<td>' + date + '</td>' +
        '<td>' + tempo + '</td>' +
        '<td>' + (g.validada ? '<span class="badge-validated">Validada</span>' : '<span class="badge-pending">Pendente</span>') + '</td>' +
        '<td>' + (g.validada
          ? (g.emailEnviado ? '<span class="badge-sent">Email enviado</span>' : '<span class="badge-pending">Email pendente</span>')
          : '<button class="btn-validate" onclick="Admin.validateGrade(\'' + (g.cursoId || 'ingles') + '\',\'' + g.email + '\',' + g.modulo + ')">Validar</button>') + '</td>';
      tbody.appendChild(tr);
    }
  },

  async validateGrade(cursoId, email, modulo) {
    if (!confirm('Validar nota do m\u00f3dulo ' + modulo + ' (' + cursoId + ') para ' + email + '?\nUm email ser\u00e1 enviado ao aluno.')) return;
    var result = await API.validateGrade(cursoId, email, modulo);
    if (result.success) {
      alert('Nota validada! Email ' + (result.data.emailEnviado ? 'enviado' : 'pendente'));
      this.loadDashboard();
    } else {
      alert(result.error || 'Erro ao validar.');
    }
  },

  renderSettings: function() {
    var container = document.getElementById('settingsContainer');
    if (!container) return;
    container.innerHTML = '';

    // Codigo convite por curso
    for (var i = 0; i < this.courses.length; i++) {
      var c = this.courses[i];
      var cConfig = this.config[c.cursoId] || {};
      container.innerHTML +=
        '<div class="settings-card">' +
          '<h3>C\u00f3digo de Convite - ' + c.nome + '</h3>' +
          '<div class="settings-row">' +
            '<input type="text" id="inviteCode-' + c.cursoId + '" value="' + (cConfig.inviteCode || '') + '">' +
            '<button class="btn-save" onclick="Admin.updateInviteCode(\'' + c.cursoId + '\')">Salvar</button>' +
          '</div>' +
        '</div>';
    }

    // Senha admin
    container.innerHTML +=
      '<div class="settings-card">' +
        '<h3>Alterar Senha do Admin</h3>' +
        '<div class="settings-row">' +
          '<input type="password" id="settingsNewPassword" placeholder="Nova senha (min. 6 caracteres)">' +
          '<button class="btn-save" onclick="Admin.updatePassword()">Alterar</button>' +
        '</div>' +
      '</div>';
  },

  async updateInviteCode(cursoId) {
    var input = document.getElementById('inviteCode-' + cursoId);
    if (!input || !input.value.trim()) { alert('C\u00f3digo n\u00e3o pode ser vazio.'); return; }
    var result = await API.updateInviteCode(cursoId, input.value.trim());
    if (result.success) alert('C\u00f3digo atualizado!');
    else alert(result.error || 'Erro.');
  },

  async updatePassword() {
    var input = document.getElementById('settingsNewPassword');
    if (!input || input.value.length < 6) { alert('Senha deve ter pelo menos 6 caracteres.'); return; }
    var result = await API.updateAdminPassword(input.value);
    if (result.success) { alert('Senha atualizada!'); input.value = ''; }
    else alert(result.error || 'Erro.');
  },

  showSection: function(sectionId) {
    document.querySelectorAll('.admin-section').forEach(function(s) { s.classList.remove('active'); });
    document.querySelectorAll('.sidebar-item').forEach(function(s) { s.classList.remove('active'); });
    var section = document.getElementById(sectionId);
    if (section) section.classList.add('active');
    if (event && event.currentTarget) event.currentTarget.classList.add('active');
  }
};

document.addEventListener('DOMContentLoaded', function() { Admin.init(); });
