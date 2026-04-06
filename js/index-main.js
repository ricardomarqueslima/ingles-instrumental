// Landing page init
        var originalSetLoggedIn = Auth.setLoggedIn.bind(Auth);
        Auth.setLoggedIn = function(nome, email, foto) {
            originalSetLoggedIn(nome, email, foto);
            // Show user bar
            var userBar = document.getElementById('userBar');
            if (userBar) userBar.style.display = 'flex';
            var nameEl = document.getElementById('landingUserName');
            if (nameEl) nameEl.textContent = 'Ola, ' + nome.split(' ')[0];
            var photoEl = document.getElementById('landingUserPhoto');
            if (photoEl && foto) {
                photoEl.innerHTML = '<img src="' + foto + '" class="user-photo" alt="Foto">';
            }
            // Admin link
            var adminLink = document.getElementById('landingAdminLink');
            if (adminLink && email === 'ricardo.marqueslima@gmail.com') {
                adminLink.style.display = 'inline-block';
            }
            // Load courses
            loadLandingCourses();
        };

        async function loadLandingCourses() {
            await Courses.loadCourses();
            await Courses.loadEnrollments();
            Courses.renderCourseCards('coursesContainer');
        }

        // Override hideAuthOverlay to NOT hide the body overflow on landing
        var origHide = Auth.hideAuthOverlay.bind(Auth);
        Auth.hideAuthOverlay = function() {
            var overlay = document.getElementById('authOverlay');
            if (overlay) {
                overlay.classList.add('auth-fade-out');
                setTimeout(function() {
                    overlay.style.display = 'none';
                    overlay.classList.remove('auth-fade-out');
                }, 400);
            }
        };

        // Override logout to reload landing
        var origLogout = Auth.handleLogout.bind(Auth);
        Auth.handleLogout = async function() {
            await API.logout();
            localStorage.clear();
            window.location.reload();
        };

        // Init
        localStorage.removeItem('cursoId'); // Landing page has no course
        if (API.BASE_URL !== 'COLE_A_URL_DO_DEPLOY_AQUI') {
            Auth.init();
        } else {
            var overlay = document.getElementById('authOverlay');
            if (overlay) overlay.style.display = 'none';
        }
