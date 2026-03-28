/**
 * exams.js - Engine de Provas Interativas
 * 5 tipos de questao: multiple_choice, true_false, drag_match, fill_blank, column_match
 */

const ExamEngine = {
  currentExam: null,
  currentQuestion: 0,
  answers: {},
  startTime: null,
  timerInterval: null,
  timeLimit: 1800, // 30 min padrao

  async start(modulo) {
    // Verificar no servidor se pode iniciar
    const check = await API.startExam(modulo);
    if (!check.success) {
      alert(check.error || 'Nao foi possivel iniciar a prova.');
      return;
    }

    // Carregar JSON da prova
    try {
      const resp = await fetch('exams/exam' + modulo + '.json');
      if (!resp.ok) throw new Error('Prova nao encontrada');
      this.currentExam = await resp.json();
    } catch (err) {
      alert('Erro ao carregar a prova. Tente novamente.');
      console.error(err);
      return;
    }

    this.currentQuestion = 0;
    this.answers = {};
    this.startTime = Date.now();
    this.timeLimit = this.currentExam.timeLimit || 1800;

    // Mostrar container de prova
    this.showExamView();
    this.renderQuestion();
    this.startTimer();
  },

  showExamView() {
    // Esconder todas as views
    document.querySelectorAll('.unit-view, #welcome').forEach(v => v.classList.remove('active'));

    const container = document.getElementById('examContainer');
    container.classList.add('active');
    container.style.display = 'block';

    // Titulo
    document.getElementById('examTitle').textContent = this.currentExam.title;
    document.getElementById('examModuleNum').textContent = 'Modulo ' + this.currentExam.module;

    // Atualizar progresso
    this.updateProgress();

    window.scrollTo(0, 0);
  },

  hideExamView() {
    const container = document.getElementById('examContainer');
    container.classList.remove('active');
    container.style.display = 'none';
    this.stopTimer();
  },

  updateProgress() {
    const total = this.currentExam.questions.length;
    const current = this.currentQuestion + 1;
    const answered = Object.keys(this.answers).length;

    document.getElementById('examProgress').textContent = `Questao ${current} de ${total}`;
    document.getElementById('examAnswered').textContent = `${answered} respondida${answered !== 1 ? 's' : ''}`;

    // Barra de progresso
    const bar = document.getElementById('examProgressBar');
    bar.style.width = ((current / total) * 100) + '%';

    // Dots de navegacao
    const dotsContainer = document.getElementById('examDots');
    dotsContainer.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const dot = document.createElement('button');
      dot.className = 'exam-dot';
      if (i === this.currentQuestion) dot.classList.add('current');
      if (this.answers[this.currentExam.questions[i].id]) dot.classList.add('answered');
      dot.textContent = i + 1;
      dot.onclick = () => this.goToQuestion(i);
      dotsContainer.appendChild(dot);
    }

    // Botoes prev/next
    document.getElementById('examPrevBtn').disabled = this.currentQuestion === 0;
    document.getElementById('examNextBtn').textContent =
      this.currentQuestion === total - 1 ? 'Revisar' : 'Proxima';
  },

  startTimer() {
    this.stopTimer();
    const timerEl = document.getElementById('examTimer');

    this.timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      const remaining = Math.max(0, this.timeLimit - elapsed);
      const min = Math.floor(remaining / 60);
      const sec = remaining % 60;

      timerEl.textContent = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;

      if (remaining <= 300) timerEl.classList.add('timer-warning');
      if (remaining <= 60) timerEl.classList.add('timer-danger');

      if (remaining <= 0) {
        this.stopTimer();
        this.finishExam(true);
      }
    }, 1000);
  },

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  },

  goToQuestion(index) {
    this.saveCurrentAnswer();
    this.currentQuestion = index;
    this.renderQuestion();
    this.updateProgress();
    // Scroll suave ate o topo da questao
    document.getElementById('examQuestionArea').scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  prevQuestion() {
    if (this.currentQuestion > 0) {
      this.goToQuestion(this.currentQuestion - 1);
    }
  },

  nextQuestion() {
    const total = this.currentExam.questions.length;
    if (this.currentQuestion < total - 1) {
      this.goToQuestion(this.currentQuestion + 1);
    } else {
      // Ultima questao - mostrar revisao
      this.showReview();
    }
  },

  saveCurrentAnswer() {
    const q = this.currentExam.questions[this.currentQuestion];
    const answer = this.collectAnswer(q);
    if (answer !== null && answer !== undefined) {
      this.answers[q.id] = answer;
    }
  },

  // ===== RENDERIZADORES POR TIPO =====

  renderQuestion() {
    const q = this.currentExam.questions[this.currentQuestion];
    const area = document.getElementById('examQuestionArea');

    let html = `
      <div class="exam-question" data-type="${q.type}">
        <div class="exam-q-header">
          <span class="exam-q-number">Questao ${this.currentQuestion + 1}</span>
          <span class="exam-q-type">${this.getTypeBadge(q.type)}</span>
        </div>
        <div class="exam-q-prompt">${q.prompt}</div>
    `;

    switch (q.type) {
      case 'multiple_choice':
        html += this.renderMultipleChoice(q);
        break;
      case 'true_false':
        html += this.renderTrueFalse(q);
        break;
      case 'drag_match':
        html += this.renderDragMatch(q);
        break;
      case 'fill_blank':
        html += this.renderFillBlank(q);
        break;
      case 'column_match':
        html += this.renderColumnMatch(q);
        break;
    }

    html += '</div>';
    area.innerHTML = html;

    // Restaurar resposta salva
    this.restoreAnswer(q);

    // Inicializar interatividade
    this.initQuestionInteractivity(q);
  },

  getTypeBadge(type) {
    const badges = {
      'multiple_choice': 'M\u00faltipla Escolha',
      'true_false': 'Verdadeiro ou Falso',
      'drag_match': 'Arraste e Combine',
      'fill_blank': 'Complete as Lacunas',
      'column_match': 'Associe as Colunas'
    };
    return badges[type] || type;
  },

  // --- MULTIPLA ESCOLHA ---
  renderMultipleChoice(q) {
    let html = '';
    if (q.text) {
      html += `<div class="exam-q-text">${q.text}</div>`;
    }
    html += '<div class="mc-options">';
    q.options.forEach((opt, idx) => {
      const letter = String.fromCharCode(65 + idx); // A, B, C, D
      html += `
        <button class="mc-option" data-value="${idx}" onclick="ExamEngine.selectMCOption(this)">
          <span class="mc-letter">${letter}</span>
          <span class="mc-text">${opt}</span>
        </button>`;
    });
    html += '</div>';
    return html;
  },

  selectMCOption(btn) {
    btn.closest('.mc-options').querySelectorAll('.mc-option').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  },

  // --- VERDADEIRO / FALSO ---
  renderTrueFalse(q) {
    let html = '';
    if (q.text) {
      html += `<div class="exam-q-text">${q.text}</div>`;
    }
    html += '<div class="tf-statements">';
    q.statements.forEach(st => {
      html += `
        <div class="tf-statement" data-id="${st.id}">
          <p class="tf-text">${st.text}</p>
          <div class="tf-buttons">
            <button class="tf-btn tf-true" data-value="true" onclick="ExamEngine.selectTF(this)">
              <span>V</span> Verdadeiro
            </button>
            <button class="tf-btn tf-false" data-value="false" onclick="ExamEngine.selectTF(this)">
              <span>F</span> Falso
            </button>
          </div>
        </div>`;
    });
    html += '</div>';
    return html;
  },

  selectTF(btn) {
    const container = btn.closest('.tf-buttons');
    container.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  },

  // --- ARRASTAR E COMBINAR ---
  renderDragMatch(q) {
    const shuffledTargets = [...q.targets].sort(() => Math.random() - 0.5);

    let html = '';
    if (q.text) {
      html += `<div class="exam-q-text">${q.text}</div>`;
    }
    html += `
      <div class="dm-container">
        <div class="dm-instruction">Arraste os itens da esquerda para os alvos correspondentes \u00e0 direita. No celular, toque primeiro no item e depois no alvo.</div>
        <div class="dm-columns">
          <div class="dm-items" id="dmItems">`;

    q.items.forEach((item, idx) => {
      html += `<div class="dm-item" draggable="true" data-item="${idx}" id="dmItem${idx}">${item}</div>`;
    });

    html += `</div>
          <div class="dm-targets" id="dmTargets">`;

    shuffledTargets.forEach((target, idx) => {
      html += `
        <div class="dm-target" data-target="${target}" id="dmTarget${idx}">
          <div class="dm-target-label">${target}</div>
          <div class="dm-drop-zone" data-target="${target}">Solte aqui</div>
        </div>`;
    });

    html += '</div></div></div>';
    return html;
  },

  // --- COMPLETAR LACUNAS ---
  renderFillBlank(q) {
    let html = '';
    if (q.text) {
      html += `<div class="exam-q-text">${q.text}</div>`;
    }
    // Substituir ___ por spans clicaveis
    let sentenceHTML = q.sentence.replace(/___+/g, (match, offset) => {
      const blankIdx = (q.sentence.substring(0, offset).match(/___+/g) || []).length;
      return `<span class="fb-blank" data-blank="${blankIdx}" onclick="ExamEngine.removeFromBlank(this)"></span>`;
    });

    const shuffledWords = [...q.wordBank].sort(() => Math.random() - 0.5);

    html += `
      <div class="fb-container">
        <div class="fb-sentence">${sentenceHTML}</div>
        <div class="fb-instruction">Clique numa palavra e depois numa lacuna para preenche-la.</div>
        <div class="fb-wordbank" id="fbWordBank">`;

    shuffledWords.forEach(word => {
      html += `<button class="fb-word" data-word="${word}" onclick="ExamEngine.selectWord(this)">${word}</button>`;
    });

    html += '</div></div>';
    return html;
  },

  selectedWord: null,

  selectWord(btn) {
    // Desselecionar anterior
    document.querySelectorAll('.fb-word.selected').forEach(b => b.classList.remove('selected'));

    if (btn.classList.contains('used')) return;

    btn.classList.add('selected');
    this.selectedWord = btn;
  },

  fillBlank(blank) {
    if (!this.selectedWord) return;

    // Se blank ja tem palavra, devolver ao banco
    if (blank.textContent) {
      const oldWord = document.querySelector(`.fb-word[data-word="${blank.textContent}"]`);
      if (oldWord) {
        oldWord.classList.remove('used');
      }
    }

    blank.textContent = this.selectedWord.dataset.word;
    blank.classList.add('filled');
    this.selectedWord.classList.add('used');
    this.selectedWord.classList.remove('selected');
    this.selectedWord = null;
  },

  removeFromBlank(blank) {
    if (!blank.textContent) {
      // Se tem palavra selecionada, preencher
      if (this.selectedWord) {
        this.fillBlank(blank);
      }
      return;
    }

    if (this.selectedWord) {
      // Trocar: devolver a atual e colocar a nova
      const oldWord = document.querySelector(`.fb-word[data-word="${blank.textContent}"]`);
      if (oldWord) oldWord.classList.remove('used');
      blank.textContent = this.selectedWord.dataset.word;
      this.selectedWord.classList.add('used');
      this.selectedWord.classList.remove('selected');
      this.selectedWord = null;
    } else {
      // Remover
      const word = document.querySelector(`.fb-word[data-word="${blank.textContent}"]`);
      if (word) word.classList.remove('used');
      blank.textContent = '';
      blank.classList.remove('filled');
    }
  },

  // --- ASSOCIAR COLUNAS ---
  renderColumnMatch(q) {
    const shuffledRight = [...q.rightColumn].sort(() => Math.random() - 0.5);

    let html = '';
    if (q.text) {
      html += `<div class="exam-q-text">${q.text}</div>`;
    }
    html += `
      <div class="cm-container">
        <div class="cm-instruction">Clique num item da esquerda e depois no item correspondente da direita para conect\u00e1-los.</div>
        <div class="cm-columns">
          <div class="cm-left">`;

    q.leftColumn.forEach((item, idx) => {
      html += `<button class="cm-item cm-left-item" data-left="${idx}" data-value="${item}" onclick="ExamEngine.selectCMLeft(this)">${item}</button>`;
    });

    html += '</div><div class="cm-lines" id="cmLines"></div><div class="cm-right">';

    shuffledRight.forEach((item, idx) => {
      html += `<button class="cm-item cm-right-item" data-right="${idx}" data-value="${item}" onclick="ExamEngine.selectCMRight(this)">${item}</button>`;
    });

    html += '</div></div></div>';
    return html;
  },

  cmSelectedLeft: null,
  cmConnections: {},

  selectCMLeft(btn) {
    document.querySelectorAll('.cm-left-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    this.cmSelectedLeft = btn;
  },

  selectCMRight(btn) {
    if (!this.cmSelectedLeft) {
      // Se nao selecionou esquerda, nada a fazer
      return;
    }

    const leftVal = this.cmSelectedLeft.dataset.value;
    const rightVal = btn.dataset.value;

    // Remover conexao anterior do item esquerdo
    if (this.cmConnections[leftVal]) {
      const oldRight = document.querySelector(`.cm-right-item[data-value="${this.cmConnections[leftVal]}"]`);
      if (oldRight) oldRight.classList.remove('connected');
    }

    // Remover conexao anterior do item direito (se outro esquerdo apontava para ele)
    Object.entries(this.cmConnections).forEach(([k, v]) => {
      if (v === rightVal && k !== leftVal) {
        delete this.cmConnections[k];
        const oldLeft = document.querySelector(`.cm-left-item[data-value="${k}"]`);
        if (oldLeft) oldLeft.classList.remove('connected');
      }
    });

    // Criar conexao
    this.cmConnections[leftVal] = rightVal;
    this.cmSelectedLeft.classList.add('connected');
    this.cmSelectedLeft.classList.remove('active');
    btn.classList.add('connected');

    this.cmSelectedLeft = null;
    this.drawCMLines();
  },

  drawCMLines() {
    const linesContainer = document.getElementById('cmLines');
    if (!linesContainer) return;

    linesContainer.innerHTML = '';
    const containerRect = linesContainer.getBoundingClientRect();

    Object.entries(this.cmConnections).forEach(([left, right]) => {
      const leftEl = document.querySelector(`.cm-left-item[data-value="${left}"]`);
      const rightEl = document.querySelector(`.cm-right-item[data-value="${right}"]`);
      if (!leftEl || !rightEl) return;

      const leftRect = leftEl.getBoundingClientRect();
      const rightRect = rightEl.getBoundingClientRect();

      const line = document.createElement('div');
      line.className = 'cm-line';

      const x1 = leftRect.right - containerRect.left;
      const y1 = leftRect.top + leftRect.height / 2 - containerRect.top;
      const x2 = rightRect.left - containerRect.left;
      const y2 = rightRect.top + rightRect.height / 2 - containerRect.top;

      const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
      const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;

      line.style.cssText = `
        position: absolute;
        left: ${x1}px;
        top: ${y1}px;
        width: ${length}px;
        height: 3px;
        background: var(--gold, #d4a017);
        transform-origin: 0 50%;
        transform: rotate(${angle}deg);
        border-radius: 2px;
        pointer-events: none;
      `;

      linesContainer.appendChild(line);
    });
  },

  // ===== INTERATIVIDADE =====

  initQuestionInteractivity(q) {
    if (q.type === 'drag_match') {
      this.initDragDrop(q);
    }
  },

  initDragDrop(q) {
    const items = document.querySelectorAll('.dm-item');
    const dropZones = document.querySelectorAll('.dm-drop-zone');

    // Desktop: HTML5 Drag & Drop
    items.forEach(item => {
      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', item.dataset.item);
        item.classList.add('dragging');
      });
      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
      });

      // Mobile: tap to select
      item.addEventListener('click', () => {
        items.forEach(i => i.classList.remove('dm-selected'));
        item.classList.add('dm-selected');
      });
    });

    dropZones.forEach(zone => {
      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('drag-over');
      });

      zone.addEventListener('dragleave', () => {
        zone.classList.remove('drag-over');
      });

      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        const itemIdx = e.dataTransfer.getData('text/plain');
        this.placeDragItem(itemIdx, zone);
      });

      // Mobile: tap to place
      zone.addEventListener('click', () => {
        const selected = document.querySelector('.dm-item.dm-selected');
        if (selected) {
          this.placeDragItem(selected.dataset.item, zone);
          selected.classList.remove('dm-selected');
        }
      });
    });
  },

  placeDragItem(itemIdx, zone) {
    const item = document.getElementById('dmItem' + itemIdx);
    if (!item) return;

    // Remover item de zona anterior
    document.querySelectorAll('.dm-drop-zone').forEach(z => {
      if (z.dataset.placed === itemIdx) {
        z.innerHTML = 'Solte aqui';
        z.classList.remove('has-item');
        delete z.dataset.placed;
      }
    });

    // Se zona ja tem item, devolver
    if (zone.dataset.placed !== undefined) {
      const oldItem = document.getElementById('dmItem' + zone.dataset.placed);
      if (oldItem) {
        oldItem.classList.remove('placed');
        oldItem.style.display = '';
      }
    }

    // Colocar item na zona
    zone.innerHTML = `<span class="dm-placed-text">${item.textContent}</span>`;
    zone.classList.add('has-item');
    zone.dataset.placed = itemIdx;
    item.classList.add('placed');
  },

  // ===== COLETAR RESPOSTAS =====

  collectAnswer(q) {
    switch (q.type) {
      case 'multiple_choice': {
        const selected = document.querySelector('.mc-option.selected');
        return selected ? parseInt(selected.dataset.value) : null;
      }

      case 'true_false': {
        const result = {};
        let hasAnswer = false;
        q.statements.forEach(st => {
          const selected = document.querySelector(`.tf-statement[data-id="${st.id}"] .tf-btn.selected`);
          if (selected) {
            result[st.id] = selected.dataset.value === 'true';
            hasAnswer = true;
          }
        });
        return hasAnswer ? result : null;
      }

      case 'drag_match': {
        const result = {};
        let hasAnswer = false;
        document.querySelectorAll('.dm-drop-zone.has-item').forEach(zone => {
          const itemIdx = zone.dataset.placed;
          const item = document.getElementById('dmItem' + itemIdx);
          if (item) {
            result[item.textContent] = zone.dataset.target;
            hasAnswer = true;
          }
        });
        return hasAnswer ? result : null;
      }

      case 'fill_blank': {
        const blanks = document.querySelectorAll('.fb-blank');
        const result = [];
        let hasAnswer = false;
        blanks.forEach(blank => {
          result.push(blank.textContent || '');
          if (blank.textContent) hasAnswer = true;
        });
        return hasAnswer ? result : null;
      }

      case 'column_match': {
        return Object.keys(this.cmConnections).length > 0 ? { ...this.cmConnections } : null;
      }

      default:
        return null;
    }
  },

  restoreAnswer(q) {
    const saved = this.answers[q.id];
    if (!saved) return;

    switch (q.type) {
      case 'multiple_choice': {
        const btn = document.querySelector(`.mc-option[data-value="${saved}"]`);
        if (btn) btn.classList.add('selected');
        break;
      }

      case 'true_false': {
        Object.entries(saved).forEach(([stId, val]) => {
          const btn = document.querySelector(`.tf-statement[data-id="${stId}"] .tf-btn[data-value="${val}"]`);
          if (btn) btn.classList.add('selected');
        });
        break;
      }

      case 'drag_match': {
        // Restaurar colocacoes
        const items = this.currentExam.questions[this.currentQuestion].items;
        Object.entries(saved).forEach(([itemText, targetText]) => {
          const itemIdx = items.indexOf(itemText);
          if (itemIdx === -1) return;
          const zone = document.querySelector(`.dm-drop-zone[data-target="${targetText}"]`);
          if (zone) this.placeDragItem(itemIdx, zone);
        });
        break;
      }

      case 'fill_blank': {
        const blanks = document.querySelectorAll('.fb-blank');
        saved.forEach((word, idx) => {
          if (word && blanks[idx]) {
            blanks[idx].textContent = word;
            blanks[idx].classList.add('filled');
            const wordBtn = document.querySelector(`.fb-word[data-word="${word}"]`);
            if (wordBtn) wordBtn.classList.add('used');
          }
        });
        break;
      }

      case 'column_match': {
        this.cmConnections = { ...saved };
        Object.entries(saved).forEach(([left, right]) => {
          const leftEl = document.querySelector(`.cm-left-item[data-value="${left}"]`);
          const rightEl = document.querySelector(`.cm-right-item[data-value="${right}"]`);
          if (leftEl) leftEl.classList.add('connected');
          if (rightEl) rightEl.classList.add('connected');
        });
        setTimeout(() => this.drawCMLines(), 100);
        break;
      }
    }
  },

  // ===== REVISAO E FINALIZACAO =====

  showReview() {
    this.saveCurrentAnswer();

    const total = this.currentExam.questions.length;
    const answered = Object.keys(this.answers).length;
    const unanswered = total - answered;

    let msg = `Voce respondeu ${answered} de ${total} questoes.`;
    if (unanswered > 0) {
      msg += `\n\n${unanswered} questao(oes) sem resposta. Deseja revisar antes de enviar?`;
    } else {
      msg += '\n\nDeseja enviar a prova?';
    }

    if (confirm(msg)) {
      this.finishExam(false);
    }
  },

  async finishExam(timeExpired) {
    this.saveCurrentAnswer();
    this.stopTimer();

    if (timeExpired) {
      alert('Tempo esgotado! Suas respostas serao enviadas automaticamente.');
    }

    const tempoGasto = Math.floor((Date.now() - this.startTime) / 1000);

    // Mostrar loading
    const area = document.getElementById('examQuestionArea');
    area.innerHTML = `
      <div class="exam-submitting">
        <div class="exam-spinner"></div>
        <p>Enviando suas respostas...</p>
      </div>`;

    const result = await API.submitExam(
      this.currentExam.module,
      this.answers,
      tempoGasto
    );

    if (result.success) {
      this.showResult(result.data);
    } else {
      area.innerHTML = `
        <div class="exam-error">
          <h3>Erro ao enviar a prova</h3>
          <p>${result.error || 'Tente novamente.'}</p>
          <button class="btn-exam" onclick="ExamEngine.retrySubmit()">Tentar Novamente</button>
        </div>`;
    }
  },

  async retrySubmit() {
    const tempoGasto = Math.floor((Date.now() - this.startTime) / 1000);
    const area = document.getElementById('examQuestionArea');
    area.innerHTML = `
      <div class="exam-submitting">
        <div class="exam-spinner"></div>
        <p>Enviando suas respostas...</p>
      </div>`;

    const result = await API.submitExam(
      this.currentExam.module,
      this.answers,
      tempoGasto
    );

    if (result.success) {
      this.showResult(result.data);
    } else {
      alert(result.error || 'Erro ao enviar. Verifique sua conexao.');
    }
  },

  showResult(data) {
    const area = document.getElementById('examQuestionArea');
    const nota = data.nota;
    const acertos = data.acertos;
    const total = data.total;

    let notaClass, notaMsg, notaEmoji;
    if (nota >= 90) { notaClass = 'excellent'; notaMsg = 'Excelente! Voce dominou este conteudo!'; notaEmoji = '&#127942;'; }
    else if (nota >= 70) { notaClass = 'good'; notaMsg = 'Muito bem! Otimo desempenho!'; notaEmoji = '&#11088;'; }
    else if (nota >= 50) { notaClass = 'average'; notaMsg = 'Bom esforco! Revise os pontos que errou.'; notaEmoji = '&#128161;'; }
    else { notaClass = 'poor'; notaMsg = 'Nao desanime! Revise o conteudo e procure o professor.'; notaEmoji = '&#128218;'; }

    let detalhesHTML = '';
    if (data.detalhes) {
      data.detalhes.forEach((d, idx) => {
        const icon = d.correta ? '&#10004;' : '&#10008;';
        const cls = d.correta ? 'correct' : 'wrong';
        detalhesHTML += `
          <div class="result-item ${cls}">
            <span class="result-icon">${icon}</span>
            <span>Questao ${d.questao}: ${d.correta ? 'Correta' : 'Incorreta'}</span>
          </div>`;
      });
    }

    area.innerHTML = `
      <div class="exam-result ${notaClass}">
        <div class="result-emoji">${notaEmoji}</div>
        <h2 class="result-nota">${nota}%</h2>
        <p class="result-acertos">${acertos} de ${total} questoes corretas</p>
        <p class="result-msg">${notaMsg}</p>

        <div class="result-details">
          ${detalhesHTML}
        </div>

        <p class="result-info">
          Sua nota foi registrada e sera validada pelo professor.<br>
          Apos a validacao, voce recebera um email com o detalhamento completo.
        </p>

        <button class="btn-exam btn-back" onclick="ExamEngine.backToUnit()">
          Voltar ao Conteudo
        </button>
      </div>`;

    // Esconder navegacao da prova
    document.getElementById('examNav').style.display = 'none';
    document.getElementById('examDots').style.display = 'none';

    // Atualizar estados
    Auth.loadAccess();
  },

  backToUnit() {
    this.hideExamView();
    document.getElementById('examNav').style.display = '';
    document.getElementById('examDots').style.display = '';
    if (this.currentExam) {
      showUnit(this.currentExam.module);
    } else {
      showView('welcome');
    }
    this.currentExam = null;
    this.cmConnections = {};
  }
};

// Redesenhar linhas ao redimensionar
window.addEventListener('resize', () => {
  if (ExamEngine.currentExam &&
      ExamEngine.currentExam.questions[ExamEngine.currentQuestion]?.type === 'column_match') {
    ExamEngine.drawCMLines();
  }
});
