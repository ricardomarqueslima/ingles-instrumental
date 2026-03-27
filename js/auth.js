/**
 * auth.js - Sistema de Autenticacao Frontend
 * Ingles Instrumental - Seminario Presbiteriano da Amazonia
 */

const Auth = {
  isLoggedIn: false,
  userName: '',
  userEmail: '',
  accessConfig: null,
  userGrades: {},

  async init() {
    const token = localStorage.getItem('sessionToken');
    if (token) {
      const result = await API.checkSession();
      if (result.success) {
        this.setLoggedIn(result.data.nome, result.data.email);
        await this.loadAccess();
        return;
      }
      // Token invalido
      localStorage.removeItem('sessionToken');
      localStorage.removeItem('userName');
      localStorage.removeItem('userEmail');
    }
    this.showAuthOverlay();
  },

  setLoggedIn(nome, email) {
    this.isLoggedIn = true;
    this.userName = nome;
    this.userEmail = email;

    localStorage.setItem('userName', nome);
    localStorage.setItem('userEmail', email);

    this.hideAuthOverlay();
    this.updateHeader();
  },

  async loadAccess() {
    const result = await API.getAccess();
    if (result.success) {
      this.accessConfig = result.data.access;
      this.userGrades = result.data.grades || {};
      this.updateModuleStates();
    }
  },

  updateModuleStates() {
    if (!this.accessConfig) return;

    // Atualizar botoes de prova
    for (let m = 1; m <= 8; m++) {
      const examArea = document.getElementById('exam-area-' + m);
      if (!examArea) continue;

      const contentLocked = !this.accessConfig['modulo' + m + '_conteudo'];
      const examUnlocked = this.accessConfig['modulo' + m + '_prova'];
      const gradeData = this.userGrades['modulo' + m];

      const btn = examArea.querySelector('.btn-exam');
      const status = examArea.querySelector('.exam-status');

      if (gradeData) {
        // Ja fez a prova
        btn.style.display = 'none';
        status.innerHTML = `<span class="exam-done">Prova realizada - Nota: <strong>${gradeData.nota}%</strong>${gradeData.validada ? ' <span class="validated-badge">Validada</span>' : ' <span class="pending-badge">Aguardando validacao</span>'}</span>`;
        status.style.display = 'block';
      } else if (examUnlocked) {
        btn.style.display = 'inline-flex';
        btn.disabled = false;
        btn.textContent = 'Fazer Prova da Unidade ' + m;
        status.style.display = 'none';
      } else {
        btn.style.display = 'inline-flex';
        btn.disabled = true;
        btn.textContent = 'Prova bloqueada';
        btn.classList.add('locked');
        status.innerHTML = '<span class="exam-locked-msg">O professor ainda nao liberou esta prova.</span>';
        status.style.display = 'block';
      }
    }
  },

  isModuleAccessible(moduleNum) {
    if (!this.accessConfig) return false;
    return this.accessConfig['modulo' + moduleNum + '_conteudo'] === true;
  },

  showAuthOverlay() {
    const overlay = document.getElementById('authOverlay');
    if (overlay) overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  },

  hideAuthOverlay() {
    const overlay = document.getElementById('authOverlay');
    if (overlay) {
      overlay.classList.add('auth-fade-out');
      setTimeout(() => {
        overlay.style.display = 'none';
        overlay.classList.remove('auth-fade-out');
        document.body.style.overflow = '';
      }, 400);
    }
  },

  updateHeader() {
    const greeting = document.getElementById('userGreeting');
    const nameSpan = document.getElementById('userName');
    const logoutBtn = document.getElementById('logoutBtn');

    if (greeting) {
      greeting.style.display = 'inline-flex';
      nameSpan.textContent = this.userName.split(' ')[0]; // Primeiro nome
    }
    if (logoutBtn) logoutBtn.style.display = 'inline-flex';
  },

  switchAuthTab(tab) {
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (tab === 'login') {
      loginTab.classList.add('active');
      registerTab.classList.remove('active');
      loginForm.style.display = 'block';
      registerForm.style.display = 'none';
    } else {
      loginTab.classList.remove('active');
      registerTab.classList.add('active');
      loginForm.style.display = 'none';
      registerForm.style.display = 'block';
    }

    // Limpar mensagens de erro
    document.getElementById('loginError').textContent = '';
    document.getElementById('registerError').textContent = '';
  },

  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');

    if (!email || !password) {
      errorEl.textContent = 'Preencha todos os campos.';
      return;
    }

    errorEl.textContent = '';
    const result = await API.login(email, password);

    if (result.success) {
      localStorage.setItem('sessionToken', result.data.token);
      this.setLoggedIn(result.data.nome, result.data.email);
      await this.loadAccess();
    } else {
      errorEl.textContent = result.error || 'Erro ao fazer login.';
    }
  },

  async handleRegister(e) {
    e.preventDefault();
    const nome = document.getElementById('regNome').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    const inviteCode = document.getElementById('regInviteCode').value.trim();
    const errorEl = document.getElementById('registerError');

    if (!nome || !email || !password || !confirmPassword || !inviteCode) {
      errorEl.textContent = 'Preencha todos os campos.';
      return;
    }

    if (password !== confirmPassword) {
      errorEl.textContent = 'As senhas nao coincidem.';
      return;
    }

    if (password.length < 6) {
      errorEl.textContent = 'A senha deve ter pelo menos 6 caracteres.';
      return;
    }

    errorEl.textContent = '';
    const result = await API.register(nome, email, password, inviteCode);

    if (result.success) {
      localStorage.setItem('sessionToken', result.data.token);
      this.setLoggedIn(result.data.nome, result.data.email);
      await this.loadAccess();
    } else {
      errorEl.textContent = result.error || 'Erro ao cadastrar.';
    }
  },

  async handleLogout() {
    await API.logout();
    this.isLoggedIn = false;
    this.userName = '';
    this.userEmail = '';
    this.accessConfig = null;
    this.userGrades = {};

    const greeting = document.getElementById('userGreeting');
    const logoutBtn = document.getElementById('logoutBtn');
    if (greeting) greeting.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'none';

    // Voltar para welcome
    if (typeof showView === 'function') showView('welcome');

    this.showAuthOverlay();
  }
};
