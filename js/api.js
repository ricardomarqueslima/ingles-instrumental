/**
 * api.js - Cliente para Google Apps Script Backend
 * Plataforma Multicursos - Seminario Presbiteriano da Amazonia
 */

function getBaseUrl() {
  const hostname = window.location.hostname;
  // Use a URL de desenvolvimento se estiver em localhost, 127.0.0.1 ou em um ambiente de desenvolvimento na nuvem.
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.github.dev')) {
    return 'http://localhost:3000'; // URL de Desenvolvimento
  } else {
    return 'https://api.spacursos.com.br'; // URL de Produção
  }
}

var API = {
  BASE_URL: getBaseUrl(),

  loading: false,

  async call(endpoint, data = null, method = 'POST') {
    this.loading = true;
    this.showLoading(true);

    try {
      var options = {
        method: method,
        headers: { 'Content-Type': 'application/json' }
      };
      
      if (data && method !== 'GET') {
        options.body = JSON.stringify(data);
      }

      var response = await fetch(this.BASE_URL + endpoint, options);
      
      if (!response.ok && response.status !== 400 && response.status !== 401) {
        throw new Error('Erro de rede: ' + response.status);
      }
      
      return await response.json();

    } catch (err) {
      console.error('Erro na API:', err);
      return { success: false, error: 'Erro de conexao. O servidor backend esta rodando?' };
    } finally {
      this.loading = false;
      this.showLoading(false);
    }
  },

  showLoading: function(show) {
    var overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = show ? 'flex' : 'none';
  },

  _getCursoId: function() {
    return localStorage.getItem('cursoId') || 'ingles';
  },

  // ===== AUTH =====
  async register(nome, email, password, inviteCode, foto) {
    return this.call('/auth/register', { nome: nome, email: email, password: password, inviteCode: inviteCode, foto: foto });
  },

  async updatePhoto(foto) {
    var token = localStorage.getItem('sessionToken');
    if (!token) return { success: false, error: 'Sessão inválida' };
    return this.call('/auth/update-photo', { token: token, foto: foto });
  },

  async login(email, password) {
    return this.call('/auth/login', { email: email, password: password });
  },

  async logout() {
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userPhoto');
    return { success: true };
  },

  async checkSession() {
    var token = localStorage.getItem('sessionToken');
    if (!token) return { success: false };
    
    // Valida o token de segurança real no backend
    const res = await this.call('/auth/access', { token: token, cursoId: this._getCursoId() });
    if (res.success) {
      return { success: true, data: { nome: localStorage.getItem('userName') || 'Aluno', email: localStorage.getItem('userEmail'), foto: localStorage.getItem('userPhoto') } };
    }
    return { success: false };
  },

  async getAccess(cursoId) {
    var token = localStorage.getItem('sessionToken');
    return this.call('/auth/access', { token: token, cursoId: cursoId || this._getCursoId() });
  },

  // ===== COURSES =====
  async getCourses() {
    const res = await this.call('/courses', null, 'GET');
    if (Array.isArray(res)) {
      return { success: true, data: res };
    }
    return res;
  },

  async getEnrollments() {
    var token = localStorage.getItem('sessionToken');
    if (!token) return { success: false };
    return this.call('/courses/enrollments', { token: token });
  },

  async enrollCourse(inviteCode) {
    var token = localStorage.getItem('sessionToken');
    return this.call('/courses/enroll', { token: token, inviteCode: inviteCode });
  },

  // ===== EXAMS =====
  async startExam(modulo, cursoId) {
    // O novo backend valida a prova no momento do envio (submit).
    // Podemos permitir o início da prova localmente sem fazer requisição de rede.
    return { success: true };
  },

  async getExamData(cursoId, modulo) {
    const data = await this.call('/exams/data/' + cursoId + '/' + modulo + '?t=' + Date.now(), null, 'GET');
    console.log("RAW Exam Data do Servidor:", data);
    return data;
  },

  async submitExam(modulo, respostas, tempoGasto, cursoId) {
    var token = localStorage.getItem('sessionToken');
    return this.call('/exams/submit', { token: token, modulo: modulo, respostas: respostas, tempoGasto: tempoGasto, cursoId: cursoId || this._getCursoId() });
  },

  async getGrades(cursoId) {
    var token = localStorage.getItem('sessionToken');
    return this.call('getGrades', { token: token, cursoId: cursoId || this._getCursoId() });
  },

  // ===== ADMIN =====
  async adminLogin(email, password) {
    return this.call('/admin/login', { email: email, password: password });
  },

  async getStudents(cursoId) {
    var adminToken = localStorage.getItem('adminToken');
    return this.call('/admin/students', { token: adminToken, cursoId: cursoId });
  },

  async getAllGrades(cursoId) {
    var adminToken = localStorage.getItem('adminToken');
    return this.call('/admin/grades', { token: adminToken, cursoId: cursoId });
  },

  async toggleModule(cursoId, modulo, tipo, habilitado) {
    var adminToken = localStorage.getItem('adminToken');
    return this.call('/admin/toggle-module', { token: adminToken, cursoId: cursoId, modulo: modulo, tipo: tipo, habilitado: habilitado });
  },

  async validateGrade(cursoId, email, modulo) {
    var adminToken = localStorage.getItem('adminToken');
    return this.call('/admin/validate-grade', { token: adminToken, cursoId: cursoId, email: email, modulo: modulo });
  },

  async updateInviteCode(cursoId, newCode) {
    var adminToken = localStorage.getItem('adminToken');
    return this.call('/admin/update-invite', { token: adminToken, cursoId: cursoId, newCode: newCode });
  },

  async updateAdminPassword(newPassword) {
    var adminToken = localStorage.getItem('adminToken');
    return this.call('/admin/update-password', { token: adminToken, newPassword: newPassword });
  },

  async getConfig() {
    var adminToken = localStorage.getItem('adminToken');
    return this.call('/admin/config', { token: adminToken });
  },

  async adminGetCourses() {
    var adminToken = localStorage.getItem('adminToken');
    return this.call('adminGetCourses', { adminToken: adminToken });
  }
};
