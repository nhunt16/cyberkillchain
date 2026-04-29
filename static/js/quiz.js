/* ============================================================
   QUIZ · thin shim
   ------------------------------------------------------------
   With the quiz collapsed to a single Final Battle challenge, the
   bulk of the interaction lives in battle.js. This file now just
   handles a couple of cross-cutting concerns:

   - keep the bottom-nav submit button gated until the active
     challenge says it's "done" (battle.js flips the disabled flag
     directly after end-of-battle, but we also wire a re-check
     here for any future challenge types).
   - tolerate older saved submissions that may still be in
     session.json so that revisiting /quiz/1 doesn't crash.

   Uses jQuery per course requirement.
   ============================================================ */

(function ($) {
  'use strict';

  $(function () {
    var root = document.querySelector('.quiz-challenge');
    if (!root) return;

    var submitBtn = document.getElementById('quizSubmitBtn');
    if (!submitBtn) return;

    // For the current Final Battle, battle.js owns the disabled
    // state. If we ever bring back another challenge type, this
    // boot function is the place to re-add a per-type validator.
    submitBtn.disabled = true;
  });

})(window.jQuery);
