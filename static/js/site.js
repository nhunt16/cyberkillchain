/* ============================================================
   SITE · shared utilities (nav, progress bar, quiz form,
   client -> server event recording).
   Uses jQuery per course requirement.
   ============================================================ */

(function ($) {
  'use strict';

  /* --- progress bar at top of page --- */
  function initProgressBar() {
    var $bar = $('#progressBar');
    if (!$bar.length) return;
    $(window).on('scroll', function () {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      $bar.css('width', h > 0 ? (window.scrollY / h) * 100 + '%' : '0%');
    });
  }

  /* --- sticky nav shadow on scroll --- */
  function initNav() {
    var $nav = $('#nav');
    if (!$nav.length) return;
    $(window).on('scroll', function () {
      $nav.toggleClass('scrolled', window.scrollY > 60);
    });
  }

  /* --- fade-in animations for .anim-fade-up elements that aren't
         already .visible (most of ours are server-marked) --- */
  function initAnimations() {
    var els = document.querySelectorAll('.anim-fade-up:not(.visible)');
    if (!els.length || typeof IntersectionObserver === 'undefined') return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) e.target.classList.add('visible');
      });
    }, { threshold: 0.1 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* --- results page: animate the score ring + counting text --- */
  function initResultRing() {
    var $ring = $('#resultRing');
    if (!$ring.length) return;
    var score = parseFloat($ring.data('score')) || 0;
    var r = 54;
    var circ = 2 * Math.PI * r;
    $ring.css({
      'stroke-dasharray': circ,
      'stroke-dashoffset': circ
    });
    setTimeout(function () {
      $ring.css('stroke-dashoffset', circ - (score / 100) * circ);
    }, 200);
  }

  /* --- helper: POST a lesson interaction event to the backend.
         Any scene can call window.recordEvent(action, detail). --- */
  window.recordEvent = function (action, detail) {
    var $body = $('.lesson-body[data-event-url]').first();
    if (!$body.length) return;
    var url = $body.attr('data-event-url');
    return $.ajax({
      url: url,
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ action: action, detail: detail || null })
    }).fail(function (xhr) {
      // Log failures but don't break the lesson interaction
      if (window.console) console.warn('recordEvent failed', action, xhr && xhr.status);
    });
  };

  $(function () {
    initProgressBar();
    initNav();
    initAnimations();
    initResultRing();
  });

})(window.jQuery);
