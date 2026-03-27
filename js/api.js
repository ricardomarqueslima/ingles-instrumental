/**
 * api.js - Cliente para Google Apps Script Backend
 * Ingles Instrumental - Seminario Presbiteriano da Amazonia
 */

const API = {
  // IMPORTANTE: Substitua pela URL do seu Google Apps Script Web App
  // Deploy > New Deployment > Web App > Copy URL
  BASE_URL: 'https://script.google.com/macros/s/AKfycbyKgiLjCCEL1cZhBdvuPS14BigcrKr5-xka6jTUYr_2BqE4OECKhsqUfE0RU0-AeHdt5w/exec',

  loading: false,

  async call(action, data = {}) {
    if (this.loading) {
      console.log('Requisicao em andamento, aguarde...');
    }

    this.loading = true;
    this.showLoading(true);

    try {
      const payload = { action, ...data };

      const response = await fetch(this.BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Erro de rede: ' + response.status);
      }

      const result = await response.json();
      return result;

    } catch (err) {
      console.error('Erro na API:', err);
      return {
        success: false,
        error: 'Erro de conexao. Verifique sua internet e tente novamente.'
      };
    } finally {
      this.loading = false;
      this.showLoading(false);
    }
  },

  showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.style.display = show ? 'flex' : 'none';
    }
  },

  // ===== AUTH =====
  async register(nome, email, password, inviteCode) {
    return this.call('register', { nome, email, password, inviteCode });
  },

  async login(email, password) {
    return this.call('login', { email, password });
  },

  async logout() {
    const token = localStorage.getItem('sessionToken');
    const result = await this.call('logout', { token });
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    return result;
  },

  async checkSession() {
    const token = localStorage.getItem('sessionToken');
    if (!token) return { success: false };
    return this.call('checkSession', { token });
  },

  async getAccess() {
    const token = localStorage.getItem('sessionToken');
    if (!token) return { success: false };
    return this.call('getAccess', { token });
  },

  // ===== EXAMS =====
  async startExam(modulo) {
    const token = localStorage.getItem('sessionToken');
    return this.call('startExam', { token, modulo });
  },

  async submitExam(modulo, respostas, tempoGasto) {
    const token = localStorage.getItem('sessionToken');
    return this.call('submitExam', { token, modulo, respostas, tempoGasto });
  },

  async getGrades() {
    const token = localStorage.getItem('sessionToken');
    return this.call('getGrades', { token });
  },

  // ===== ADMIN =====
  async adminLogin(email, password) {
    return this.call('adminLogin', { email, password });
  },

  async getStudents() {
    const adminToken = localStorage.getItem('adminToken');
    return this.call('getStudents', { adminToken });
  },

  async getAllGrades() {
    const adminToken = localStorage.getItem('adminToken');
    return this.call('getAllGrades', { adminToken });
  },

  async toggleModule(modulo, tipo, habilitado) {
    const adminToken = localStorage.getItem('adminToken');
    return this.call('toggleModule', { adminToken, modulo, tipo, habilitado });
  },

  async validateGrade(email, modulo) {
    const adminToken = localStorage.getItem('adminToken');
    return this.call('validateGrade', { adminToken, email, modulo });
  },

  async updateInviteCode(newCode) {
    const adminToken = localStorage.getItem('adminToken');
    return this.call('updateInviteCode', { adminToken, newCode });
  },

  async updateAdminPassword(newPassword) {
    const adminToken = localStorage.getItem('adminToken');
    return this.call('updateAdminPassword', { adminToken, newPassword });
  },

  async getConfig() {
    const adminToken = localStorage.getItem('adminToken');
    return this.call('getConfig', { adminToken });
  }
};
