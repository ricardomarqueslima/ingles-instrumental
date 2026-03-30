/**
 * api.js - Cliente para Google Apps Script Backend
 * Plataforma Multicursos - Seminario Presbiteriano da Amazonia
 */

var API = {
  BASE_URL: 'https://script.google.com/macros/s/AKfycbyKgiLjCCEL1cZhBdvuPS14BigcrKr5-xka6jTUYr_2BqE4OECKhsqUfE0RU0-AeHdt5w/exec',

  loading: false,

  async call(action, data) {
    data = data || {};
    this.loading = true;
    this.showLoading(true);

    try {
      var payload = Object.assign({ action: action }, data);

      var response = await fetch(this.BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Erro de rede: ' + response.status);
      return await response.json();

    } catch (err) {
      console.error('Erro na API:', err);
      return { success: false, error: 'Erro de conexao. Verifique sua internet e tente novamente.' };
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
    return this.call('register', { nome: nome, email: email, password: password, inviteCode: inviteCode, foto: foto });
  },

  async updatePhoto(foto) {
    var token = localStorage.getItem('sessionToken');
    return this.call('updatePhoto', { token: token, foto: foto });
  },

  async login(email, password) {
    return this.call('login', { email: email, password: password });
  },

  async logout() {
    var token = localStorage.getItem('sessionToken');
    var result = await this.call('logout', { token: token });
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userPhoto');
    return result;
  },

  async checkSession() {
    var token = localStorage.getItem('sessionToken');
    if (!token) return { success: false };
    return this.call('checkSession', { token: token });
  },

  async getAccess(cursoId) {
    var token = localStorage.getItem('sessionToken');
    if (!token) return { success: false };
    return this.call('getAccess', { token: token, cursoId: cursoId || this._getCursoId() });
  },

  // ===== COURSES =====
  async getCourses() {
    return this.call('getCourses', {});
  },

  async getEnrollments() {
    var token = localStorage.getItem('sessionToken');
    if (!token) return { success: false };
    return this.call('getEnrollments', { token: token });
  },

  async enrollCourse(inviteCode) {
    var token = localStorage.getItem('sessionToken');
    return this.call('enrollCourse', { token: token, inviteCode: inviteCode });
  },

  // ===== EXAMS =====
  async startExam(modulo, cursoId) {
    var token = localStorage.getItem('sessionToken');
    return this.call('startExam', { token: token, modulo: modulo, cursoId: cursoId || this._getCursoId() });
  },

  async submitExam(modulo, respostas, tempoGasto, cursoId) {
    var token = localStorage.getItem('sessionToken');
    return this.call('submitExam', { token: token, modulo: modulo, respostas: respostas, tempoGasto: tempoGasto, cursoId: cursoId || this._getCursoId() });
  },

  async getGrades(cursoId) {
    var token = localStorage.getItem('sessionToken');
    return this.call('getGrades', { token: token, cursoId: cursoId || this._getCursoId() });
  },

  // ===== ADMIN =====
  async adminLogin(email, password) {
    return this.call('adminLogin', { email: email, password: password });
  },

  async getStudents() {
    var adminToken = localStorage.getItem('adminToken');
    return this.call('getStudents', { adminToken: adminToken });
  },

  async getAllGrades(cursoId) {
    var adminToken = localStorage.getItem('adminToken');
    return this.call('getAllGrades', { adminToken: adminToken, cursoId: cursoId });
  },

  async toggleModule(cursoId, modulo, tipo, habilitado) {
    var adminToken = localStorage.getItem('adminToken');
    return this.call('toggleModule', { adminToken: adminToken, cursoId: cursoId, modulo: modulo, tipo: tipo, habilitado: habilitado });
  },

  async validateGrade(cursoId, email, modulo) {
    var adminToken = localStorage.getItem('adminToken');
    return this.call('validateGrade', { adminToken: adminToken, cursoId: cursoId, email: email, modulo: modulo });
  },

  async updateInviteCode(cursoId, newCode) {
    var adminToken = localStorage.getItem('adminToken');
    return this.call('updateInviteCode', { adminToken: adminToken, cursoId: cursoId, newCode: newCode });
  },

  async updateAdminPassword(newPassword) {
    var adminToken = localStorage.getItem('adminToken');
    return this.call('updateAdminPassword', { adminToken: adminToken, newPassword: newPassword });
  },

  async getConfig() {
    var adminToken = localStorage.getItem('adminToken');
    return this.call('getConfig', { adminToken: adminToken });
  },

  async adminGetCourses() {
    var adminToken = localStorage.getItem('adminToken');
    return this.call('adminGetCourses', { adminToken: adminToken });
  }
};
