// ===================== STATE =====================
        const state = {
            currentView: 'welcome',
            completedUnits: new Set(),
            scores: {},
            presenterMode: false
        };

        // ===================== NAVIGATION =====================
        function showView(viewId) {
            document.querySelectorAll('.unit-view').forEach(v => { v.classList.remove('active'); v.style.display = 'none'; });
            const view = document.getElementById(viewId);
            if (view) {
                view.classList.add('active');
                view.style.display = 'block';
                state.currentView = viewId;
                updateNav();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }

        function showUnit(num) {
            // Verificar se modulo esta liberado
            if (Auth.isLoggedIn && Auth.accessConfig && !Auth.isModuleAccessible(num)) {
                document.querySelectorAll('.unit-view').forEach(v => v.classList.remove('active'));
                const view = document.getElementById('unit' + num);
                if (view) {
                    view.classList.add('active');
                    state.currentView = 'unit' + num;
                    updateNav();
                    // Mostrar overlay de bloqueio temporariamente
                    const oldContent = view.innerHTML;
                    // Nao substituir, apenas mostrar alerta
                    alert('Este modulo ainda nao foi liberado pelo professor.');
                    showView('welcome');
                    return;
                }
            }
            showView('unit' + num);
        }

        function updateNav() {
            document.querySelectorAll('.nav-item').forEach((item, i) => {
                item.classList.remove('active');
                if (i === 0 && state.currentView === 'welcome') {
                    item.classList.add('active');
                } else if (i > 0 && state.currentView === 'unit' + i) {
                    item.classList.add('active');
                }
                // Mark completed
                if (i > 0 && state.completedUnits.has(i)) {
                    item.classList.add('completed');
                }
            });
            document.getElementById('progressText').textContent =
                state.completedUnits.size + ' de 8 unidades';
        }

        // ===================== EXERCISES =====================
        const exerciseTracker = {};

        function checkAnswer(btn, isCorrect, groupId) {
            const group = document.getElementById(groupId);
            const buttons = group.querySelectorAll('.option-btn');
            const feedbackEl = document.getElementById('fb-' + groupId);

            // Prevent re-answering
            if (group.dataset.answered) return;
            group.dataset.answered = 'true';

            buttons.forEach(b => {
                b.classList.add('disabled');
            });

            if (isCorrect) {
                btn.classList.add('correct');
                feedbackEl.className = 'feedback-msg show correct';
                feedbackEl.innerHTML = '&#10004; Correto! Excelente!';
            } else {
                btn.classList.add('incorrect');
                // Highlight correct answer
                buttons.forEach(b => {
                    if (b.onclick && b.onclick.toString().includes('true')) {
                        // This is a hack but works for demo
                    }
                });
                feedbackEl.className = 'feedback-msg show incorrect';
                feedbackEl.innerHTML = '&#10008; Incorreto. Revise o conte&uacute;do e tente novamente na pr&oacute;xima vez!';
            }

            // Track scores
            const exerciseId = groupId.split('-')[0] + '-' + groupId.split('-')[1].replace('q', '');
            const exGroup = groupId.split('-')[0];

            if (!exerciseTracker[exGroup]) {
                exerciseTracker[exGroup] = { total: 0, correct: 0, answered: 0 };
            }

            // Count total questions for this exercise
            const unitView = group.closest('.unit-view');
            if (unitView) {
                const allGroups = unitView.querySelectorAll('.exercise-item');
                exerciseTracker[exGroup].total = allGroups.length;
            }

            exerciseTracker[exGroup].answered++;
            if (isCorrect) exerciseTracker[exGroup].correct++;

            // Check if all questions answered
            if (exerciseTracker[exGroup].answered >= exerciseTracker[exGroup].total) {
                showScore(exGroup);
            }
        }

        function showScore(exGroup) {
            const tracker = exerciseTracker[exGroup];
            const scoreEl = document.getElementById('score-' + exGroup);
            const numEl = document.getElementById('score-' + exGroup + '-num');
            const textEl = document.getElementById('score-' + exGroup + '-text');

            if (!scoreEl || !numEl || !textEl) return;

            const pct = Math.round((tracker.correct / tracker.total) * 100);
            numEl.textContent = tracker.correct + '/' + tracker.total;

            let msg = '';
            if (pct === 100) msg = 'Perfeito! Voc&ecirc; dominou este conte&uacute;do!';
            else if (pct >= 70) msg = '&Oacute;timo trabalho! Continue assim!';
            else if (pct >= 50) msg = 'Bom esfor&ccedil;o! Revise os pontos que errou.';
            else msg = 'N&atilde;o desanime! Revise o conte&uacute;do e tente novamente.';

            textEl.innerHTML = msg;
            scoreEl.classList.add('show');

            // Mark unit as completed
            const unitNum = parseInt(exGroup.replace('ex', ''));
            if (!isNaN(unitNum)) {
                state.completedUnits.add(unitNum);
                updateNav();
            }
        }

        // ===================== COLLAPSIBLE =====================
        document.addEventListener('click', function(e) {
            if (e.target.closest('.collapsible-header')) {
                const header = e.target.closest('.collapsible-header');
                const content = header.nextElementSibling;
                header.classList.toggle('open');
                content.classList.toggle('open');
            }
        });

        // ===================== PRESENTER MODE =====================
        function togglePresenterMode() {
            state.presenterMode = !state.presenterMode;
            document.body.classList.toggle('presenter-mode', state.presenterMode);
            const btn = document.querySelector('.btn-presenter');
            btn.textContent = state.presenterMode ?
                '\u{1F4FA} Modo Normal' : '\u{1F4FA} Modo Apresenta\u00E7\u00E3o';
        }

        // ===================== KEYBOARD NAV =====================
        document.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                const currentNum = parseInt(state.currentView.replace('unit', ''));
                if (!isNaN(currentNum) && currentNum < 8) {
                    showUnit(currentNum + 1);
                }
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                const currentNum = parseInt(state.currentView.replace('unit', ''));
                if (!isNaN(currentNum) && currentNum > 1) {
                    showUnit(currentNum - 1);
                } else if (!isNaN(currentNum) && currentNum === 1) {
                    showView('welcome');
                }
            } else if (e.key === 'Home') {
                showView('welcome');
            }
        });

        // ===================== TEXT-TO-SPEECH =====================
        const tts = {
            synth: window.speechSynthesis,
            voice: null,
            rate: 0.8,
            currentBtn: null,

            init() {
                // Load voices
                const loadVoices = () => {
                    const voices = this.synth.getVoices();
                    // Prefer high-quality English voices
                    this.voice = voices.find(v => v.name.includes('Samantha') && v.lang.startsWith('en')) ||
                                 voices.find(v => v.name.includes('Google') && v.lang.startsWith('en-US')) ||
                                 voices.find(v => v.lang === 'en-US' && v.localService) ||
                                 voices.find(v => v.lang === 'en-GB') ||
                                 voices.find(v => v.lang.startsWith('en')) ||
                                 voices[0];
                };
                loadVoices();
                this.synth.onvoiceschanged = loadVoices;

                // Speed slider
                const slider = document.getElementById('speedSlider');
                const display = document.getElementById('speedValue');
                slider.addEventListener('input', () => {
                    this.rate = parseFloat(slider.value);
                    display.textContent = this.rate.toFixed(1) + 'x';
                });
            },

            speak(text, btn) {
                // If already speaking, force stop
                if (this.synth.speaking || this.currentBtn) {
                    this.synth.cancel();
                    // Workaround: Chrome bug where cancel() doesn't always work
                    try { this.synth.resume(); this.synth.cancel(); } catch(e) {}
                    if (this.currentBtn) {
                        this.currentBtn.classList.remove('playing');
                        this.currentBtn.innerHTML = '&#9654;';
                    }
                    // If clicking the same button, just stop
                    if (this.currentBtn === btn) {
                        this.currentBtn = null;
                        return;
                    }
                    this.currentBtn = null;
                }

                // Clean text for speech - remove tooltip content and special chars
                const cleanText = text
                    .replace(/[\u201c\u201d\u201e\u201f\u2033\u2036]/g, '')
                    .replace(/[\u2018\u2019\u201a\u201b\u2032\u2035]/g, "'")
                    .replace(/\s+/g, ' ')
                    .trim();

                if (!cleanText) return;

                const utterance = new SpeechSynthesisUtterance(cleanText);
                utterance.voice = this.voice;
                utterance.rate = this.rate;
                utterance.pitch = 1;
                utterance.lang = 'en-US';

                this.currentBtn = btn;
                btn.classList.add('playing');
                btn.innerHTML = '&#9724;';

                const resetBtn = () => {
                    btn.classList.remove('playing');
                    btn.innerHTML = '&#9654;';
                    tts.currentBtn = null;
                };

                utterance.onend = resetBtn;
                utterance.onerror = resetBtn;

                // Workaround: Chrome pauses long speech after ~15s
                // Resume periodically to prevent freezing
                if (this._resumeInterval) clearInterval(this._resumeInterval);
                this._resumeInterval = setInterval(() => {
                    if (this.synth.speaking && !this.synth.paused) {
                        this.synth.pause();
                        this.synth.resume();
                    } else if (!this.synth.speaking) {
                        clearInterval(this._resumeInterval);
                    }
                }, 10000);

                this.synth.speak(utterance);
            }
        };

        // Auto-inject TTS buttons into example boxes and tables
        function injectTTSButtons() {
            // 1. Add play buttons to all .example-box .en elements
            document.querySelectorAll('.example-box .en').forEach(el => {
                if (el.querySelector('.tts-btn')) return; // already has one
                const text = el.getAttribute('data-tts') || el.textContent.trim();
                if (!text) return;
                const btn = document.createElement('button');
                btn.className = 'tts-btn';
                btn.innerHTML = '&#9654;';
                btn.title = 'Ouvir pronúncia';
                btn.onclick = function(e) { e.stopPropagation(); tts.speak(text, this); };
                el.prepend(btn);
            });

            // 2. Add play buttons to table cells with English text
            document.querySelectorAll('.word-table').forEach(table => {
                const rows = table.querySelectorAll('tr');
                rows.forEach((row, i) => {
                    if (i === 0) return; // skip header
                    // Find cells that contain English examples (usually last column or specific columns)
                    const cells = row.querySelectorAll('td');
                    cells.forEach(cell => {
                        const text = cell.textContent.trim();
                        // Only add to cells with English sentences (contain period or quotes or common patterns)
                        if (cell.querySelector('.tts-btn')) return;
                        if ((text.includes('"') || text.includes('.') || text.includes('!')) &&
                            /[A-Z]/.test(text) && text.length > 15) {
                            const btn = document.createElement('button');
                            btn.className = 'tts-btn small';
                            btn.innerHTML = '&#9654;';
                            btn.title = 'Ouvir pronúncia';
                            const cleanText = text.replace(/[""]/g, '');
                            btn.onclick = function(e) { e.stopPropagation(); tts.speak(cleanText, this); };
                            cell.appendChild(document.createTextNode(' '));
                            cell.appendChild(btn);
                        }
                    });
                });
            });

            // 3. Add play button to text-analysis blocks
            document.querySelectorAll('.text-analysis').forEach(block => {
                if (block.querySelector('.tts-block-btn')) return;
                // Extrair apenas texto visivel, ignorando tooltips
                const clone = block.cloneNode(true);
                clone.querySelectorAll('.tooltip-text').forEach(el => el.remove());
                const text = clone.textContent.trim();
                if (!text) return;
                const wrapper = document.createElement('div');
                wrapper.className = 'tts-block-btn';
                const btn = document.createElement('button');
                btn.className = 'tts-btn';
                btn.innerHTML = '&#9654;';
                btn.title = 'Ouvir texto completo';
                btn.onclick = function(e) { e.stopPropagation(); tts.speak(text, this); };
                const label = document.createElement('span');
                label.textContent = ' Ouvir texto ';
                label.style.fontSize = '0.8rem';
                label.style.color = 'var(--primary)';
                label.style.fontFamily = 'Open Sans, sans-serif';
                label.style.fontWeight = '600';
                wrapper.appendChild(btn);
                wrapper.appendChild(label);
                block.prepend(wrapper);
            });

            // 4. Add play buttons to exercise questions containing English text in quotes
            document.querySelectorAll('.exercise-item .question').forEach(q => {
                if (q.querySelector('.tts-btn')) return;
                const text = q.textContent.trim();
                // Extract English text between quotes
                const match = text.match(/["\u201c]([^"\u201d]+)["\u201d]/);
                if (match) {
                    const engText = match[1];
                    const btn = document.createElement('button');
                    btn.className = 'tts-btn small';
                    btn.innerHTML = '&#9654;';
                    btn.title = 'Ouvir pronúncia';
                    btn.style.marginLeft = '8px';
                    btn.onclick = function(e) { e.stopPropagation(); tts.speak(engText, this); };
                    q.appendChild(btn);
                }
            });

            // 5. Add play button to the welcome verse
            document.querySelectorAll('.welcome-verse').forEach(verse => {
                if (verse.querySelector('.tts-btn')) return;
                const refEl = verse.querySelector('.ref');
                const text = verse.textContent.replace(refEl ? refEl.textContent : '', '').trim();
                const btn = document.createElement('button');
                btn.className = 'tts-btn';
                btn.innerHTML = '&#9654;';
                btn.title = 'Ouvir versículo';
                btn.style.marginTop = '12px';
                btn.onclick = function(e) { e.stopPropagation(); tts.speak(text, this); };
                verse.appendChild(btn);
            });
        }

        // ===================== YOUTUBE FALLBACK =====================
        // YouTube blocks embeds on file:// protocol.
        // Replace iframes with clickable thumbnails when opened locally.
        function fixYouTubeEmbeds() {
            const isFileProtocol = window.location.protocol === 'file:';
            if (!isFileProtocol) return; // Only apply fix for file:// access

            document.querySelectorAll('.video-wrapper iframe').forEach(iframe => {
                const src = iframe.getAttribute('src') || '';
                const match = src.match(/youtube\.com\/embed\/([^?&"]+)/);
                if (!match) return;

                const videoId = match[1];
                const youtubeUrl = 'https://www.youtube.com/watch?v=' + videoId;
                const thumbUrl = 'https://img.youtube.com/vi/' + videoId + '/hqdefault.jpg';

                const link = document.createElement('a');
                link.href = youtubeUrl;
                link.target = '_blank';
                link.rel = 'noopener';
                link.className = 'video-thumb-link';
                link.title = 'Clique para assistir no YouTube';
                link.innerHTML =
                    '<img src="' + thumbUrl + '" alt="Thumbnail do v\u00eddeo" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">' +
                    '<div class="video-play-overlay">' +
                        '<div class="video-play-btn">&#9654;</div>' +
                        '<div class="video-play-text">Assistir no YouTube</div>' +
                    '</div>';

                iframe.parentNode.replaceChild(link, iframe);
            });
        }

        // Initialize TTS
        tts.init();
        // Inject after a short delay to ensure DOM is ready
        setTimeout(injectTTSButtons, 300);
        // Fix YouTube embeds for file:// protocol
        setTimeout(fixYouTubeEmbeds, 100);

        // Initialize
        updateNav();

        // Definir curso atual
        localStorage.setItem('cursoId', 'ingles');
        if (typeof Courses !== 'undefined') Courses.setCursoId('ingles');

        // Initialize Auth (check session, show login if needed)
        if (typeof Auth !== 'undefined' && API.BASE_URL !== 'COLE_A_URL_DO_DEPLOY_AQUI') {
            Auth.init();
        } else {
            // Modo offline / sem backend configurado - esconder overlay
            const overlay = document.getElementById('authOverlay');
            if (overlay) overlay.style.display = 'none';
            console.log('Modo offline: backend nao configurado. Auth desabilitado.');
        }
