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
      const result = await API.checkSession();
      if (result.success) {
        this.setLoggedIn(result.data.nome, result.data.email, result.data.foto);
        await this.loadAccess();
        // Se nao tem foto, solicitar
        if (!result.data.foto) {
          this.showPhotoRequest();
        }
        return;
      }
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
    }
  },

  numModulos: 8,

  updateModuleStates() {
    if (!this.accessConfig) return;
    var maxMod = this.numModulos || 8;
    for (let m = 1; m <= maxMod; m++) {
      const examArea = document.getElementById('exam-area-' + m);
      if (!examArea) continue;
      const examUnlocked = this.accessConfig['modulo' + m + '_prova'];
      const gradeData = this.userGrades['modulo' + m];
      const btn = examArea.querySelector('.btn-exam');
      const status = examArea.querySelector('.exam-status');
      if (gradeData) {
        btn.style.display = 'none';
        status.innerHTML = '<span class="exam-done">Prova realizada - Nota: <strong>' + gradeData.nota + '%</strong>' + (gradeData.validada ? ' <span class="validated-badge">Validada</span>' : ' <span class="pending-badge">Aguardando validacao</span>') + '</span>';
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
  }
};
