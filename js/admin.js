/**
 * admin.js - Logica do Painel Administrativo
 * Ingles Instrumental - Seminario Presbiteriano da Amazonia
 */

const Admin = {
  token: null,
  config: null,
  students: [],
  grades: [],

  init() {
    this.token = localStorage.getItem('adminToken');
    if (this.token) {
      this.loadDashboard();
    }
  },

  // ===== LOGIN =====
  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value;
    const errorEl = document.getElementById('adminLoginError');

    if (!email || !password) {
      errorEl.textContent = 'Preencha todos os campos.';
      return;
    }

    errorEl.textContent = '';
    const result = await API.adminLogin(email, password);

    if (result.success) {
      this.token = result.data.token;
      localStorage.setItem('adminToken', this.token);
      this.loadDashboard();
    } else {
      errorEl.textContent = result.error || 'Erro ao fazer login.';
    }
  },

  handleLogout() {
    localStorage.removeItem('adminToken');
    this.token = null;
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('dashboard').style.display = 'none';
  },

  // ===== DASHBOARD =====
  async loadDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';

    // Carregar tudo em paralelo
    const [configRes, studentsRes, gradesRes] = await Promise.all([
      API.getConfig(),
      API.getStudents(),
      API.getAllGrades()
    ]);

    if (!configRes.success) {
      alert('Sessao expirada. Faca login novamente.');
      this.handleLogout();
      return;
    }

    this.config = configRes.data;
    this.students = studentsRes.success ? studentsRes.data : [];
    this.grades = gradesRes.success ? gradesRes.data : [];

    this.renderStats();
    this.renderModuleGrid();
    this.renderStudentsTable();
    this.renderGradesTable();
    this.renderSettings();
  },

  // ===== STATS =====
  renderStats() {
    document.getElementById('statStudents').textContent = this.students.length;
    document.getElementById('statExams').textContent = this.grades.length;

    const pending = this.grades.filter(g => !g.validada).length;
    document.getElementById('statPending').textContent = pending;

    const avg = this.grades.length > 0
      ? Math.round(this.grades.reduce((sum, g) => sum + (g.nota || 0), 0) / this.grades.length)
      : 0;
    document.getElementById('statAverage').textContent = avg + '%';
  },

  // ===== MODULE GRID =====
  renderModuleGrid() {
    const moduleNames = {
      1: 'Inferencia Contextual',
      2: 'Cognatos',
      3: 'Afixacao',
      4: 'Sinonimia e Antonimia',
      5: 'Morfossintaxe',
      6: 'Ordem das Palavras',
      7: 'Coesao Textual',
      8: 'Reconhecimento Gramatical'
    };

    const grid = document.getElementById('moduleGrid');
    grid.innerHTML = '';

    for (let m = 1; m <= 8; m++) {
      const contentOn = this.config['modulo' + m + '_conteudo'];
      const provaOn = this.config['modulo' + m + '_prova'];
      const examsForModule = this.grades.filter(g => g.modulo == m);
      const completed = examsForModule.length;

      const card = document.createElement('div');
      card.className = 'module-card';
      card.innerHTML = `
        <div class="module-card-header">
          <span class="module-num">${m}</span>
          <span class="module-name">${moduleNames[m]}</span>
        </div>
        <div class="module-card-body">
          <div class="toggle-row">
            <span>Conteudo</span>
            <label class="toggle">
              <input type="checkbox" ${contentOn ? 'checked' : ''} onchange="Admin.toggleModule(${m}, 'conteudo', this.checked)">
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="toggle-row">
            <span>Prova</span>
            <label class="toggle">
              <input type="checkbox" ${provaOn ? 'checked' : ''} onchange="Admin.toggleModule(${m}, 'prova', this.checked)">
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="module-stat">${completed} prova${completed !== 1 ? 's' : ''} realizada${completed !== 1 ? 's' : ''}</div>
        </div>
      `;
      grid.appendChild(card);
    }
  },

  async toggleModule(modulo, tipo, habilitado) {
    const result = await API.toggleModule(modulo, tipo, habilitado);
    if (!result.success) {
      alert(result.error || 'Erro ao alterar modulo.');
      this.loadDashboard();
    }
  },

  // ===== STUDENTS TABLE =====
  renderStudentsTable() {
    const tbody = document.getElementById('studentsBody');
    tbody.innerHTML = '';

    if (this.students.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-msg">Nenhum aluno cadastrado ainda.</td></tr>';
      return;
    }

    this.students.forEach(s => {
      const date = s.dataRegistro ? new Date(s.dataRegistro).toLocaleDateString('pt-BR') : '-';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${s.nome}</td>
        <td>${s.email}</td>
        <td>${s.turma || '-'}</td>
        <td>${date}</td>
        <td>${s.provasFeitas}/8</td>
      `;
      tbody.appendChild(tr);
    });
  },

  // ===== GRADES TABLE =====
  renderGradesTable() {
    const tbody = document.getElementById('gradesBody');
    tbody.innerHTML = '';

    const filterModule = document.getElementById('filterModule')?.value || 'all';
    const filterStatus = document.getElementById('filterStatus')?.value || 'all';

    let filtered = [...this.grades];

    if (filterModule !== 'all') {
      filtered = filtered.filter(g => g.modulo == filterModule);
    }
    if (filterStatus === 'pending') {
      filtered = filtered.filter(g => !g.validada);
    } else if (filterStatus === 'validated') {
      filtered = filtered.filter(g => g.validada);
    }

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-msg">Nenhuma nota encontrada.</td></tr>';
      return;
    }

    // Ordenar: pendentes primeiro, depois por data
    filtered.sort((a, b) => {
      if (a.validada !== b.validada) return a.validada ? 1 : -1;
      return new Date(b.data) - new Date(a.data);
    });

    filtered.forEach(g => {
      const date = g.data ? new Date(g.data).toLocaleDateString('pt-BR') : '-';
      const tempo = g.tempoGasto ? Math.floor(g.tempoGasto / 60) + 'min' : '-';
      const notaClass = g.nota >= 70 ? 'nota-good' : g.nota >= 50 ? 'nota-avg' : 'nota-bad';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${g.nome}</td>
        <td>Modulo ${g.modulo}</td>
        <td class="${notaClass}">${g.nota}%</td>
        <td>${date}</td>
        <td>${tempo}</td>
        <td>${g.validada
          ? '<span class="badge-validated">Validada</span>'
          : '<span class="badge-pending">Pendente</span>'}</td>
        <td>${g.validada
          ? (g.emailEnviado ? '<span class="badge-sent">Email enviado</span>' : '<span class="badge-pending">Email pendente</span>')
          : `<button class="btn-validate" onclick="Admin.validateGrade('${g.email}', ${g.modulo})">Validar e Enviar</button>`}</td>
      `;
      tbody.appendChild(tr);
    });
  },

  async validateGrade(email, modulo) {
    if (!confirm(`Confirma a validacao da nota do modulo ${modulo} para ${email}?\n\nUm email com a prova corrigida sera enviado ao aluno.`)) {
      return;
    }

    const result = await API.validateGrade(email, modulo);
    if (result.success) {
      alert(`Nota validada com sucesso!\nEmail ${result.data.emailEnviado ? 'enviado' : 'pendente'} para ${email}`);
      this.loadDashboard();
    } else {
      alert(result.error || 'Erro ao validar nota.');
    }
  },

  // ===== SETTINGS =====
  renderSettings() {
    document.getElementById('settingsInviteCode').value = this.config.inviteCode || '';
  },

  async updateInviteCode() {
    const newCode = document.getElementById('settingsInviteCode').value.trim();
    if (!newCode) { alert('Codigo nao pode ser vazio.'); return; }

    const result = await API.updateInviteCode(newCode);
    if (result.success) {
      alert('Codigo de convite atualizado!');
    } else {
      alert(result.error || 'Erro ao atualizar codigo.');
    }
  },

  async updatePassword() {
    const newPass = document.getElementById('settingsNewPassword').value;
    if (!newPass || newPass.length < 6) {
      alert('Senha deve ter pelo menos 6 caracteres.');
      return;
    }

    const result = await API.updateAdminPassword(newPass);
    if (result.success) {
      alert('Senha atualizada com sucesso!');
      document.getElementById('settingsNewPassword').value = '';
    } else {
      alert(result.error || 'Erro ao atualizar senha.');
    }
  },

  // ===== NAVIGATION =====
  showSection(sectionId) {
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.sidebar-item').forEach(s => s.classList.remove('active'));

    document.getElementById(sectionId).classList.add('active');
    event.currentTarget?.classList.add('active');
  }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  Admin.init();
});
