/**
 * auth.js - Sistema de Autenticacao Frontend
 * Ingles Instrumental - Seminario Presbiteriano da Amazonia
 */

const Auth = {
  isLoggedIn: false,
  userName: '',
  userEmail: '',
  userPhoto: null,
  accessConfig: null,
  userGrades: {},
  _pendingPhoto: null, // Base64 da foto sendo selecionada

  async init() {
    const token = localStorage.getItem('sessionToken');
    if (token) {
      API.showLoading(true);
      const result = await API.checkSession();
      if (result.success) {
        this.setLoggedIn(result.data.nome, result.data.email, result.data.foto);
        await this.loadAccess();
        API.showLoading(false);
        // Se nao tem foto, solicitar
        if (!result.data.foto) {
          this.showPhotoRequest();
        }
        return;
      }
      API.showLoading(false);
      localStorage.removeItem('sessionToken');
      localStorage.removeItem('userName');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userPhoto');
    }
    this.showAuthOverlay();
  },

  setLoggedIn(nome, email, foto) {
    this.isLoggedIn = true;
    this.userName = nome;
    this.userEmail = email;
    this.userPhoto = foto || null;

    localStorage.setItem('userName', nome);
    localStorage.setItem('userEmail', email);
    if (foto) localStorage.setItem('userPhoto', foto);

    this.hideAuthOverlay();
    this.updateHeader();
  },

  async loadAccess() {
    var cursoId = localStorage.getItem('cursoId');
    const result = await API.getAccess(cursoId);
    if (result.success) {
      this.accessConfig = result.data.access;
      this.userGrades = result.data.grades || {};
      this.numModulos = result.data.courseInfo ? result.data.courseInfo.numModulos : 8;
      this.updateModuleStates();
    } else {
      console.error('❌ Erro ao carregar acessos do Banco de Dados:', result.error);
      if (result.error && result.error.includes('Token')) { this.handleLogout(); }
    }
  },

  numModulos: 8,

  updateModuleStates() {
    if (!this.accessConfig) return;

    // À PROVA DE FALHAS: O JS agora garante que todos os botões existam, mesmo que faltem no HTML!
    const cursoId = localStorage.getItem('cursoId') || 'ingles';
    const maxMod = cursoId.includes('portugues') ? 5 : 9; // Módulo 6 de PT não tem prova

    for (let m = 1; m <= maxMod; m++) {
      let examArea = document.getElementById('exam-area-' + m);
      
      // Se o HTML perdeu o botão, nós o recriamos magicamente aqui:
      if (!examArea) {
        const unitView = document.getElementById('unit' + m);
        if (unitView) {
          examArea = document.createElement('div');
          examArea.className = 'exam-btn-area';
          examArea.id = 'exam-area-' + m;
          examArea.innerHTML = '<button class="btn-exam" onclick="ExamEngine.start(' + m + ')" disabled>Prova bloqueada</button><p class="exam-status" id="exam-status-' + m + '"></p>';
          const navBtns = unitView.querySelector('.nav-buttons');
          if (navBtns) unitView.insertBefore(examArea, navBtns);
          else unitView.appendChild(examArea);
        }
      }

      if (!examArea) continue;

      const examUnlocked = this.accessConfig['modulo' + m + '_prova'];
      const gradeData = this.userGrades['modulo' + m];
      const btn = examArea.querySelector('.btn-exam');
      const status = examArea.querySelector('.exam-status');
      if (gradeData) {
        btn.style.display = 'inline-flex';
        btn.disabled = true;
        btn.classList.add('locked');
        btn.textContent = 'Prova Realizada';
        status.innerHTML = '<span class="exam-done">Nota: <strong>' + gradeData.nota + '%</strong>' + (gradeData.validada ? ' <span class="validated-badge">Validada</span>' : ' <span class="pending-badge">Aguardando validação</span>') + '</span>';
        status.style.display = 'block';
      } else if (examUnlocked !== false) {
        btn.style.display = 'inline-flex';
        btn.disabled = false;
        btn.classList.remove('locked');
        btn.textContent = 'Fazer Prova da Unidade ' + m;
        status.style.display = 'none';
      } else {
        btn.style.display = 'inline-flex';
        btn.disabled = true;
        btn.classList.add('locked');
        btn.textContent = 'Prova bloqueada';
        status.innerHTML = '<span class="exam-locked-msg">O professor ainda não liberou esta prova.</span>';
        status.style.display = 'block';
      }
    }
  },

  isModuleAccessible(moduleNum) {
    if (!this.accessConfig) return true;
    return this.accessConfig['modulo' + moduleNum + '_conteudo'] !== false;
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
    const photoContainer = document.getElementById('userPhotoContainer');

    if (greeting) {
      greeting.style.display = 'inline-flex';
      nameSpan.textContent = this.userName.split(' ')[0];
    }
    if (logoutBtn) logoutBtn.style.display = 'inline-flex';

    // Mostrar link admin para o professor
    const adminLink = document.getElementById('adminLink');
    if (adminLink && this.userEmail === 'ricardo.marqueslima@gmail.com') {
      adminLink.style.display = 'inline-flex';
    }

    // Atualizar foto no header
    if (photoContainer) {
      if (this.userPhoto) {
        photoContainer.className = '';
        photoContainer.innerHTML = '<img src="' + this.userPhoto + '" class="user-photo" alt="Foto">';
      } else {
        photoContainer.className = 'user-photo-placeholder';
        photoContainer.innerHTML = '&#128100;';
      }
    }
  },

  // ===== FOTO: Redimensionar imagem para thumbnail =====
  resizeImage(file, maxSize) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          if (w > h) { if (w > maxSize) { h = h * maxSize / w; w = maxSize; } }
          else { if (h > maxSize) { w = w * maxSize / h; h = maxSize; } }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  },

  // Preview foto no formulario de cadastro
  async previewPhoto(input) {
    if (!input.files || !input.files[0]) return;
    const base64 = await this.resizeImage(input.files[0], 150);
    this._pendingPhoto = base64;
    const preview = document.getElementById('regPhotoPreview');
    if (preview) {
      preview.innerHTML = '<img src="' + base64 + '" style="width:100%;height:100%;object-fit:cover;">';
    }
  },

  // Preview foto no overlay de solicitacao
  async previewPhotoRequest(input) {
    if (!input.files || !input.files[0]) return;
    const base64 = await this.resizeImage(input.files[0], 150);
    this._pendingPhoto = base64;
    const preview = document.getElementById('photoReqPreview');
    if (preview) {
      preview.innerHTML = '<img src="' + base64 + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
    }
  },

  // Mostrar overlay de solicitacao de foto
  showPhotoRequest() {
    const overlay = document.getElementById('photoRequestOverlay');
    if (overlay) overlay.style.display = 'flex';
  },

  skipPhoto() {
    const overlay = document.getElementById('photoRequestOverlay');
    if (overlay) overlay.style.display = 'none';
  },

  async savePhotoRequest() {
    if (!this._pendingPhoto) {
      alert('Selecione uma foto primeiro.');
      return;
    }
    const result = await API.updatePhoto(this._pendingPhoto);
    if (result.success) {
      this.userPhoto = this._pendingPhoto;
      localStorage.setItem('userPhoto', this.userPhoto);
      this.updateHeader();
      this.skipPhoto();
      this._pendingPhoto = null;
    } else {
      alert(result.error || 'Erro ao salvar foto.');
    }
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
    document.getElementById('loginError').textContent = '';
    document.getElementById('registerError').textContent = '';
  },

  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    if (!email || !password) { errorEl.textContent = 'Preencha todos os campos.'; return; }
    errorEl.textContent = '';
    const result = await API.login(email, password);
    if (result.success) {
      localStorage.setItem('sessionToken', result.data.token);
      this.setLoggedIn(result.data.nome, result.data.email, result.data.foto);
      await this.loadAccess();
      // Se nao tem foto, solicitar
      if (!result.data.foto) {
        this.showPhotoRequest();
      }
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
      errorEl.textContent = 'Preencha todos os campos.'; return;
    }
    if (password !== confirmPassword) { errorEl.textContent = 'As senhas nao coincidem.'; return; }
    if (password.length < 6) { errorEl.textContent = 'A senha deve ter pelo menos 6 caracteres.'; return; }
    errorEl.textContent = '';

    // Incluir foto se selecionada
    const foto = this._pendingPhoto || null;
    const result = await API.register(nome, email, password, inviteCode, foto);
    if (result.success) {
      localStorage.setItem('sessionToken', result.data.token);
      this.setLoggedIn(result.data.nome, result.data.email, foto);
      this._pendingPhoto = null;
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
    this.userPhoto = null;
    this.accessConfig = null;
    this.userGrades = {};
    localStorage.removeItem('userPhoto');
    const greeting = document.getElementById('userGreeting');
    const logoutBtn = document.getElementById('logoutBtn');
    if (greeting) greeting.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (typeof showView === 'function') showView('welcome');
    this.showAuthOverlay();
  },

  // ===== RECUPERAÇÃO DE SENHA =====
  showForgotPassword() {
    var loginForm = document.getElementById('loginForm');
    var registerForm = document.getElementById('registerForm');
    var forgotForm = document.getElementById('forgotForm');
    var authTabs = document.querySelector('.auth-tabs');
    if (loginForm) loginForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'none';
    if (forgotForm) forgotForm.style.display = 'block';
    if (authTabs) authTabs.style.display = 'none';
    var errorEl = document.getElementById('forgotError');
    if (errorEl) errorEl.textContent = '';
    // Mostrar etapa 1 (email), esconder etapa 2 (código)
    var step1 = document.getElementById('forgotStep1');
    var step2 = document.getElementById('forgotStep2');
    if (step1) step1.style.display = 'block';
    if (step2) step2.style.display = 'none';
  },

  hideForgotPassword() {
    var loginForm = document.getElementById('loginForm');
    var forgotForm = document.getElementById('forgotForm');
    var authTabs = document.querySelector('.auth-tabs');
    if (loginForm) loginForm.style.display = 'block';
    if (forgotForm) forgotForm.style.display = 'none';
    if (authTabs) authTabs.style.display = 'flex';
    this.switchAuthTab('login');
  },

  async handleForgotSubmit(e) {
    e.preventDefault();
    var email = document.getElementById('forgotEmail').value.trim();
    var errorEl = document.getElementById('forgotError');
    if (!email) { errorEl.textContent = 'Informe o e-mail.'; return; }
    errorEl.textContent = '';
    var result = await API.forgotPassword(email);
    if (result.success) {
      // Avança para etapa 2
      this._resetEmail = email;
      var step1 = document.getElementById('forgotStep1');
      var step2 = document.getElementById('forgotStep2');
      if (step1) step1.style.display = 'none';
      if (step2) step2.style.display = 'block';
      errorEl.style.color = 'var(--success)';
      errorEl.textContent = result.message || 'Código enviado!';
    } else {
      errorEl.style.color = 'var(--accent)';
      errorEl.textContent = result.error || 'Erro ao enviar código.';
    }
  },

  async handleResetSubmit(e) {
    e.preventDefault();
    var code = document.getElementById('resetCode').value.trim();
    var newPass = document.getElementById('resetPassword').value;
    var confirmPass = document.getElementById('resetConfirmPassword').value;
    var errorEl = document.getElementById('forgotError');
    if (!code || !newPass || !confirmPass) { errorEl.style.color = 'var(--accent)'; errorEl.textContent = 'Preencha todos os campos.'; return; }
    if (newPass !== confirmPass) { errorEl.style.color = 'var(--accent)'; errorEl.textContent = 'As senhas não coincidem.'; return; }
    if (newPass.length < 6) { errorEl.style.color = 'var(--accent)'; errorEl.textContent = 'A senha deve ter pelo menos 6 caracteres.'; return; }
    errorEl.textContent = '';
    var result = await API.resetPassword(this._resetEmail, code, newPass);
    if (result.success) {
      errorEl.style.color = 'var(--success)';
      errorEl.textContent = result.message || 'Senha alterada!';
      setTimeout(function() { Auth.hideForgotPassword(); }, 2000);
    } else {
      errorEl.style.color = 'var(--accent)';
      errorEl.textContent = result.error || 'Erro ao redefinir senha.';
    }
  }
};
