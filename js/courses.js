/**
 * courses.js - Gerenciamento de Cursos
 * Plataforma Multicursos - Seminario Presbiteriano da Amazonia
 */

var Courses = {
  currentCursoId: null,
  courses: [],
  enrollments: [],

  init: function() {
    this.currentCursoId = localStorage.getItem('cursoId') || null;
  },

  getCursoId: function() {
    return this.currentCursoId || localStorage.getItem('cursoId');
  },

  setCursoId: function(cursoId) {
    this.currentCursoId = cursoId;
    localStorage.setItem('cursoId', cursoId);
  },

  async loadCourses() {
    var result = await API.getCourses();
    if (result.success) {
      this.courses = result.data || [];
    }
    return this.courses;
  },

  async loadEnrollments() {
    var result = await API.getEnrollments();
    if (result.success) {
      this.enrollments = result.data || [];
    }
    return this.enrollments;
  },

  isEnrolled: function(cursoId) {
    return this.enrollments.some(function(e) { return e.cursoId === cursoId; });
  },

  getCoursePage: function(cursoId) {
    var pages = {
      'ingles': 'ingles.html',
      'portugues1': 'portugues1.html',
      'portugues2': 'portugues2.html',
      'portugues3': 'portugues3.html'
    };
    return pages[cursoId] || 'index.html';
  },

  navigateToCourse: function(cursoId) {
    this.setCursoId(cursoId);
    window.location.href = this.getCoursePage(cursoId);
  },

  async enrollInCourse(inviteCode) {
    var result = await API.enrollCourse(inviteCode);
    if (result.success) {
      await this.loadEnrollments();
    }
    return result;
  },

  // Renderizar cards de cursos na landing page
  renderCourseCards: function(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var self = this;
    var enrolledIds = this.enrollments.map(function(e) { return e.cursoId; });

    // Separar cursos matriculados e disponiveis
    var enrolled = [];
    var available = [];

    this.courses.forEach(function(course) {
      if (enrolledIds.indexOf(course.cursoId) >= 0) {
        enrolled.push(course);
      } else {
        available.push(course);
      }
    });

    var html = '';

    // Meus cursos
    if (enrolled.length > 0) {
      html += '<h2 class="courses-section-title">Meus Cursos</h2>';
      html += '<div class="courses-grid">';
      enrolled.forEach(function(course) {
        html += self._renderCourseCard(course, true);
      });
      html += '</div>';
    }

    // Cursos disponiveis
    if (available.length > 0) {
      html += '<h2 class="courses-section-title" style="margin-top:40px;">Cursos Dispon\u00edveis</h2>';
      html += '<div class="courses-grid">';
      available.forEach(function(course) {
        html += self._renderCourseCard(course, false);
      });
      html += '</div>';
    }

    if (enrolled.length === 0 && available.length === 0) {
      html += '<div class="no-courses"><p>Nenhum curso dispon\u00edvel no momento.</p></div>';
    }

    container.innerHTML = html;
  },

  _renderCourseCard: function(course, isEnrolled) {
    var colors = {
      'ingles': { bg: '#1a5632', icon: '\uD83C\uDF0D' },
      'portugues1': { bg: '#1a3a6b', icon: '\uD83D\uDCD6' },
      'portugues2': { bg: '#6b1a3a', icon: '\uD83D\uDCD5' },
      'portugues3': { bg: '#3a1a6b', icon: '\uD83D\uDCD7' }
    };
    var color = colors[course.cursoId] || { bg: '#333', icon: '\uD83D\uDCDA' };

    if (isEnrolled) {
      return '<div class="course-card" onclick="Courses.navigateToCourse(\'' + course.cursoId + '\')">' +
        '<div class="course-card-header" style="background:linear-gradient(135deg,' + color.bg + ',' + color.bg + 'cc);">' +
          '<span class="course-icon">' + color.icon + '</span>' +
          '<h3>' + course.nome + '</h3>' +
          '<span class="course-code">' + course.codigo + '</span>' +
        '</div>' +
        '<div class="course-card-body">' +
          '<p>' + course.numModulos + ' m\u00f3dulos</p>' +
          '<button class="btn-enter-course">Acessar Curso</button>' +
        '</div>' +
      '</div>';
    } else {
      return '<div class="course-card available">' +
        '<div class="course-card-header" style="background:linear-gradient(135deg,' + color.bg + '44,' + color.bg + '22);">' +
          '<span class="course-icon" style="opacity:0.5;">' + color.icon + '</span>' +
          '<h3 style="color:' + color.bg + ';">' + course.nome + '</h3>' +
          '<span class="course-code" style="color:' + color.bg + '88;">' + course.codigo + '</span>' +
        '</div>' +
        '<div class="course-card-body">' +
          '<p>' + course.numModulos + ' m\u00f3dulos</p>' +
          '<p class="enroll-hint">Insira o c\u00f3digo de convite para se inscrever</p>' +
          '<div class="enroll-form">' +
            '<input type="text" class="enroll-input" id="enroll-' + course.cursoId + '" placeholder="C\u00f3digo de convite">' +
            '<button class="btn-enroll" onclick="Courses.handleEnroll(\'' + course.cursoId + '\')">Inscrever-se</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }
  },

  async handleEnroll(cursoId) {
    var input = document.getElementById('enroll-' + cursoId);
    if (!input || !input.value.trim()) {
      alert('Insira o c\u00f3digo de convite.');
      return;
    }
    var result = await this.enrollInCourse(input.value.trim());
    if (result.success) {
      alert('Inscri\u00e7\u00e3o realizada com sucesso!');
      this.renderCourseCards('coursesContainer');
    } else {
      alert(result.error || 'C\u00f3digo de convite inv\u00e1lido.');
    }
  }
};
