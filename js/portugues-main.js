var state={currentView:'welcome',completedUnits:new Set(),presenterMode:false};
        function showView(id){document.querySelectorAll('.unit-view').forEach(function(v){v.classList.remove('active');v.style.display='none';});var el=document.getElementById(id);if(el){el.classList.add('active');el.style.display='block';state.currentView=id;updateNav();window.scrollTo({top:0,behavior:'smooth'});}}
        function showUnit(num){if(typeof Auth!=='undefined'&&Auth.isLoggedIn&&Auth.accessConfig&&!Auth.isModuleAccessible(num)){alert('Este módulo ainda não foi liberado pelo professor.');return;}showView('unit'+num);}
        function updateNav(){document.querySelectorAll('.nav-item').forEach(function(item,i){item.classList.remove('active');if(i===0&&state.currentView==='welcome')item.classList.add('active');else if(i>0&&state.currentView==='unit'+i)item.classList.add('active');if(i>0&&state.completedUnits.has(i))item.classList.add('completed');});var pt=document.getElementById('progressText');if(pt)pt.textContent=state.completedUnits.size+' de 6 unidades';}
        var ET={};
        function checkAnswer(btn,ok,gid){var g=document.getElementById(gid);if(!g||g.dataset.answered)return;g.dataset.answered='true';g.querySelectorAll('.option-btn').forEach(function(b){b.classList.add('disabled');if(b===btn)b.classList.add(ok?'correct':'incorrect');if(!ok&&b.getAttribute('onclick')&&b.getAttribute('onclick').includes('true'))b.classList.add('correct');});var fb=document.getElementById('fb-'+gid);if(fb){fb.classList.add('show',ok?'correct':'incorrect');fb.textContent=ok?'Correto! Muito bem!':'Incorreto. Veja a resposta em verde.';}var eg=gid.split('-')[0];if(!ET[eg])ET[eg]={total:0,correct:0,answered:0};if(!ET[eg].total)ET[eg].total=document.querySelectorAll('[id^="'+eg+'-"]').length;ET[eg].answered++;if(ok)ET[eg].correct++;if(ET[eg].answered>=ET[eg].total)showScore(eg);}
        function showScore(eg){var t=ET[eg];var se=document.getElementById('score-'+eg);if(!se)return;var pct=Math.round((t.correct/t.total)*100);var ne=document.getElementById('score-'+eg+'-num');var te=document.getElementById('score-'+eg+'-text');if(ne)ne.textContent=t.correct+'/'+t.total;if(te)te.textContent=pct===100?'Perfeito!':pct>=70?'Ótimo!':pct>=50?'Bom esforço!':'Revise o conteúdo.';se.classList.add('show');var un=parseInt(eg.replace('ex',''));if(!isNaN(un)){state.completedUnits.add(un);updateNav();}}
        function inlineQuiz(btn,qid,ok,exp){var c=btn.closest('.inline-quiz');if(!c||c.dataset.answered)return;c.dataset.answered='true';c.querySelectorAll('.quiz-btn').forEach(function(b){b.disabled=true;if(b===btn)b.classList.add(ok?'iq-correct':'iq-wrong');});var fb=document.getElementById(qid);if(fb){fb.textContent=exp;fb.classList.add('show',ok?'correct':'wrong');}}
        document.addEventListener('click',function(e){var h=e.target.closest('.collapsible-header');if(h){h.classList.toggle('open');var c=h.nextElementSibling;if(c)c.classList.toggle('open');}});
        function togglePresenterMode(){state.presenterMode=!state.presenterMode;document.body.classList.toggle('presenter-mode',state.presenterMode);var btn=document.querySelector('.btn-presenter');if(btn)btn.textContent=state.presenterMode?'&#128250; Modo Normal':'&#128250; Modo Apresentação';}
        function checkPractice(btn,ok,qid){var c=document.getElementById(qid);if(!c)return;c.querySelectorAll('.pq-option').forEach(function(b){b.disabled=true;});if(ok){btn.classList.add('correct');c.classList.add('answered-correct');}else{btn.classList.add('wrong');c.classList.add('answered-wrong');c.querySelectorAll('.pq-option').forEach(function(b){if(b.getAttribute('onclick')&&b.getAttribute('onclick').indexOf('true')>-1)b.classList.add('correct');});}var fb=document.getElementById(qid+'-feedback');if(fb){fb.style.display='block';fb.className='pq-feedback '+(ok?'correct-fb':'wrong-fb');}updatePracticeScore();}
        function updatePracticeScore(){var tot=document.querySelectorAll('.practice-question').length;var cor=document.querySelectorAll('.practice-question.answered-correct').length;var ans=cor+document.querySelectorAll('.practice-question.answered-wrong').length;var se=document.getElementById('practiceScoreText');if(se)se.textContent=cor+' de '+ans+' corretas ('+tot+' total)';}
        document.addEventListener('keydown',function(e){var n=parseInt(state.currentView.replace('unit',''));if(e.key==='ArrowRight'&&!isNaN(n)&&n<6)showUnit(n+1);else if(e.key==='ArrowLeft'){if(!isNaN(n)&&n>1)showUnit(n-1);else if(n===1)showView('welcome');}else if(e.key==='Home')showView('welcome');});
        var BASE='audio/fonemas/';
        var AUDIO_MAP={'a':'a','e':'e','ɛ':'eps','i':'i','o':'o','ɔ':'ope','u':'u','ã':'an','ẽ':'en','ĩ':'in','õ':'on','ũ':'un','p':'p','b':'b','t':'t','d':'d','k':'k','g':'g','f':'f','v':'v','s':'s','z':'z','ʃ':'sh','ʒ':'zh','m':'m','n':'n','ɲ':'nh','l':'l','ʎ':'lh','ɾ':'r','ʁ':'rr','r':'r'};
        var _cache={};
        function pronouncePhoneme(ipa,btn){
            var key=AUDIO_MAP[ipa];if(!key)return;
            var url=BASE+key+'.ogg';
            if(btn){btn.classList.add('playing');setTimeout(function(){btn.classList.remove('playing');},700);}
            window.speechSynthesis.cancel();
            var cached=_cache[url];if(!cached){cached=new Audio(url);_cache[url]=cached;}
            cached.currentTime=0;
            cached.play().catch(function(){var tts={'a':'a','e':'ê','ɛ':'é','i':'i','o':'ô','ɔ':'ó','u':'u','ã':'mão','ẽ':'tem','ĩ':'vim','õ':'bom','ũ':'um','p':'pa','b':'ba','t':'ta','d':'da','k':'ca','g':'ga','f':'fa','v':'va','s':'sa','z':'za','ʃ':'xa','ʒ':'ja','m':'ma','n':'na','ɲ':'nha','l':'la','ʎ':'lha','ɾ':'caro','ʁ':'rato','r':'ara'};var u=new SpeechSynthesisUtterance(tts[ipa]||ipa);u.lang='pt-BR';u.rate=.5;u.pitch=1;window.speechSynthesis.speak(u);});
        }
        updateNav();
        localStorage.setItem('cursoId','portugues1');

        // ==========================================
        // Integração Dinâmica com a API NestJS
        // ==========================================
        async function fetchModules() {
            try {
                const res = await fetch('http://localhost:3000/courses');
                const data = await res.json();
                if (data && data.length > 0) {
                    const course = data[0]; // Pega o primeiro curso retornado pelo BD
                    const grid = document.getElementById('dynamic-units-grid');
                    if (grid) {
                        grid.innerHTML = ''; // Apaga a bolinha de carregamento
                        // Lista de ícones para decorar cada módulo:
                        const icons = ['&#128172;', '&#128264;', '&#9998;', '&#128297;', '&#128218;', '&#128203;'];
                        
                        course.modules.forEach((mod, index) => {
                            const icon = icons[index % icons.length];
                            grid.innerHTML += `
                                <div class="unit-card" onclick="showUnit(${mod.order})">
                                    <div class="unit-num">${mod.order}</div>
                                    <div class="unit-icon">${icon}</div>
                                    <h3>${mod.title}</h3>
                                    <p>${mod.description}</p>
                                </div>
                            `;
                        });
                    }
                }
            } catch(e) {
                console.error("Erro ao conectar com o backend:", e);
                document.getElementById('dynamic-units-grid').innerHTML = '<p style="grid-column: 1/-1; text-align:center; color: var(--accent); font-weight: bold;">Erro ao carregar o curso. O servidor está ligado?</p>';
            }
        }
        fetchModules(); // Inicia a busca assim que a página carrega

        if(typeof Courses!=='undefined')Courses.setCursoId('portugues1');
        
        // ===================== YOUTUBE FALLBACK =====================
        // Contorna o "Erro 153" do YouTube quando rodando localmente (file://)
        function fixYouTubeEmbeds() {
            const isFileProtocol = window.location.protocol === 'file:';
            if (!isFileProtocol) return; 

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
                link.innerHTML = '<img src="' + thumbUrl + '" alt="Thumbnail do vídeo" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">' +
                                 '<div class="video-play-overlay"><div class="video-play-btn">&#9654;</div><div class="video-play-text">Assistir no YouTube</div></div>';

                iframe.parentNode.replaceChild(link, iframe);
            });
        }
        setTimeout(fixYouTubeEmbeds, 100);

        // Reativando o sistema de Login agora que o backend está pronto!
        if(typeof Auth!=='undefined'){Auth.init();}
