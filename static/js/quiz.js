/* ============================================================
   QUIZ · three-challenge interactive flow
   ------------------------------------------------------------
   Each quiz page mounts exactly one `.quiz-challenge` node whose
   data-* attributes carry the JSON config for the challenge and
   any previously-saved submission. This module reads that config,
   initializes the correct interaction (drag-reorder, drag-match,
   or the defend-simulation click flow), keeps a running
   "submission" object, and serializes it into a hidden input on
   the form so the Flask backend can grade + persist it.
   Uses jQuery per course requirement.
   ============================================================ */

(function ($) {
  'use strict';

  function readJson(el, attr, fallback) {
    var raw = el.getAttribute(attr);
    if (!raw) return fallback;
    try { return JSON.parse(raw); } catch (e) { return fallback; }
  }

  function shuffle(arr) {
    return arr.slice().sort(function () { return Math.random() - 0.5; });
  }

  /* ------------------------------------------------------------
     Challenge 1 · Reconstruct the Kill Chain
     ------------------------------------------------------------ */
  function initOrder(root, challenge, correctOrder, saved) {
    var zone = root.querySelector('#orderZone');
    if (!zone) return null;

    // Use the saved order if the user has already submitted this
    // challenge once, otherwise shuffle a fresh arrangement.
    var initial = Array.isArray(saved) && saved.length === correctOrder.length
      ? saved.slice()
      : shuffle(correctOrder);

    initial.forEach(function (name, i) {
      var card = document.createElement('div');
      card.className = 'quiz-card';
      card.dataset.name = name;
      card.innerHTML =
        '<div class="quiz-card-handle"><span></span><span></span><span></span></div>' +
        '<div class="quiz-card-position">' + (i + 1) + '</div>' +
        '<div class="quiz-card-text">' + name + '</div>';
      zone.appendChild(card);
    });

    enableReorderDrag(zone, '.quiz-card');

    function currentOrder() {
      return Array.prototype.map.call(
        zone.querySelectorAll('.quiz-card'),
        function (c) { return c.dataset.name; }
      );
    }
    function onChange() { setSubmission(currentOrder()); }

    // The user has a populated list on load, so the submission is
    // valid immediately — we just sync it + enable submit.
    zone.addEventListener('orderchanged', onChange);
    onChange();
    return { valid: function () { return true; } };
  }

  function enableReorderDrag(container, selector) {
    container.addEventListener('pointerdown', function (e) {
      var card = e.target.closest(selector);
      if (!card) return;
      e.preventDefault();

      var startRect = card.getBoundingClientRect();
      var offsetY = e.clientY - startRect.top;
      var offsetX = e.clientX - startRect.left;

      var placeholder = document.createElement('div');
      placeholder.className = 'quiz-card-placeholder';
      placeholder.style.height = startRect.height + 'px';
      card.parentNode.insertBefore(placeholder, card);

      card.classList.add('dragging');
      card.style.position = 'fixed';
      card.style.width = startRect.width + 'px';
      card.style.top = startRect.top + 'px';
      card.style.left = startRect.left + 'px';
      card.style.zIndex = '1000';
      card.style.transition = 'box-shadow 0.2s ease, transform 0.2s ease';
      card.style.transform = 'scale(1.04)';

      function onMove(e2) {
        e2.preventDefault();
        card.style.top = (e2.clientY - offsetY) + 'px';
        card.style.left = (e2.clientX - offsetX) + 'px';

        var siblings = [].slice.call(container.querySelectorAll(selector + ':not(.dragging)'));
        var placed = false;
        for (var i = 0; i < siblings.length; i++) {
          var sib = siblings[i];
          var r = sib.getBoundingClientRect();
          if (e2.clientY < r.top + r.height / 2) {
            if (sib !== placeholder.nextElementSibling) {
              container.insertBefore(placeholder, sib);
            }
            placed = true;
            break;
          }
        }
        if (!placed) {
          var last = siblings[siblings.length - 1];
          if (last && placeholder !== last.nextElementSibling) last.after(placeholder);
        }
      }

      function onUp() {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);

        var phRect = placeholder.getBoundingClientRect();
        card.style.transition = 'top 0.18s ease-out, left 0.18s ease-out, transform 0.18s ease-out, box-shadow 0.18s ease-out';
        card.style.top = phRect.top + 'px';
        card.style.left = phRect.left + 'px';
        card.style.transform = 'scale(1)';

        setTimeout(function () {
          card.style.position = '';
          card.style.width = '';
          card.style.top = '';
          card.style.left = '';
          card.style.zIndex = '';
          card.style.transition = '';
          card.style.transform = '';
          card.classList.remove('dragging');
          placeholder.replaceWith(card);
          updatePositions(container, selector);
          container.dispatchEvent(new CustomEvent('orderchanged'));
        }, 180);
      }

      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
    });
  }

  function updatePositions(container, selector) {
    container.querySelectorAll(selector).forEach(function (c, i) {
      var p = c.querySelector('.quiz-card-position');
      if (p) p.textContent = i + 1;
    });
  }

  /* ------------------------------------------------------------
     Challenge 2 · Classify the Attack Events
     ------------------------------------------------------------ */
  function initMatch(root, challenge, correctOrder, saved) {
    var pool = root.querySelector('#eventPool');
    var grid = root.querySelector('#phaseTargets');
    if (!pool || !grid) return null;

    var events = challenge.events || [];
    var savedMap = (saved && typeof saved === 'object' && !Array.isArray(saved)) ? saved : null;

    // Phase targets, in the canonical chain order.
    correctOrder.forEach(function (label) {
      var t = document.createElement('div');
      t.className = 'quiz-phase-target';
      t.dataset.phase = label;
      t.innerHTML =
        '<div class="quiz-phase-target-label">' + label + '</div>' +
        '<div class="quiz-phase-target-content"></div>';
      grid.appendChild(t);
    });

    // Event cards. Start in the pool (shuffled), or restore into
    // the previously-chosen phase bucket if we have a saved map.
    shuffle(events).forEach(function (ev) {
      var el = document.createElement('div');
      el.className = 'quiz-event';
      el.setAttribute('draggable', 'true');
      el.dataset.id = ev.id;
      el.dataset.phase = ev.phase;
      el.textContent = ev.text;

      var savedPhase = savedMap ? savedMap[ev.id] : null;
      if (savedPhase) {
        var target = grid.querySelector('.quiz-phase-target[data-phase="' + cssEscape(savedPhase) + '"] .quiz-phase-target-content');
        if (target) { target.appendChild(el); el.classList.add('placed'); return; }
      }
      pool.appendChild(el);
    });

    bindMatchDrag(root);
    syncMatch(root);

    root.addEventListener('matchchanged', function () { syncMatch(root); });
    return {
      valid: function () {
        return root.querySelectorAll('.quiz-phase-target-content .quiz-event').length === events.length;
      }
    };
  }

  function bindMatchDrag(root) {
    var dragged = null;
    root.addEventListener('dragstart', function (e) {
      var el = e.target.closest && e.target.closest('.quiz-event');
      if (!el) return;
      dragged = el; el.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', el.dataset.id || '');
    });
    root.addEventListener('dragend', function (e) {
      var el = e.target.closest && e.target.closest('.quiz-event');
      if (!el) return;
      el.classList.remove('dragging');
      root.querySelectorAll('.quiz-phase-target').forEach(function (t) { t.classList.remove('drag-over'); });
      dragged = null;
    });

    root.querySelectorAll('.quiz-phase-target').forEach(function (target) {
      target.addEventListener('dragover', function (e) { e.preventDefault(); target.classList.add('drag-over'); });
      target.addEventListener('dragleave', function () { target.classList.remove('drag-over'); });
      target.addEventListener('drop', function (e) {
        e.preventDefault();
        target.classList.remove('drag-over');
        if (!dragged) return;
        var content = target.querySelector('.quiz-phase-target-content');
        var existing = content.querySelector('.quiz-event');
        if (existing && existing !== dragged) {
          existing.classList.remove('placed');
          root.querySelector('#eventPool').appendChild(existing);
        }
        dragged.classList.add('placed');
        dragged.classList.remove('dragging');
        content.appendChild(dragged);
        root.dispatchEvent(new CustomEvent('matchchanged'));
      });
    });

    // Click a placed card to pop it back to the pool.
    root.querySelectorAll('.quiz-phase-target-content').forEach(function (c) {
      c.addEventListener('click', function (e) {
        var ev = e.target.closest('.quiz-event');
        if (!ev) return;
        ev.classList.remove('placed');
        root.querySelector('#eventPool').appendChild(ev);
        root.dispatchEvent(new CustomEvent('matchchanged'));
      });
    });
  }

  function syncMatch(root) {
    var map = {};
    root.querySelectorAll('.quiz-phase-target').forEach(function (t) {
      var ev = t.querySelector('.quiz-event');
      if (ev) map[ev.dataset.id] = t.dataset.phase;
    });
    setSubmission(map);
    // Also revalidate the submit button.
    updateSubmitEnabled();
  }

  /* ------------------------------------------------------------
     Challenge 3 · Defend the Network (5-round simulation)
     ------------------------------------------------------------ */
  function initDefend(root, challenge) {
    var startBtn = root.querySelector('#defendStartBtn');
    var scenario = root.querySelector('#defendScenario');
    var timeline = root.querySelector('#defendTimeline');
    if (!startBtn || !scenario || !timeline) return null;

    var rounds = challenge.rounds || [];
    var picks = {};        // { "0": "r1a", "1": "r2b", ... }
    var finished = false;

    startBtn.addEventListener('click', function () {
      startBtn.style.display = 'none';
      timeline.innerHTML = '<div class="defend-track-line"></div>';
      rounds.forEach(function (rd, i) {
        var node = document.createElement('div');
        node.className = 'defend-node';
        node.dataset.index = i;
        node.innerHTML =
          '<span class="defend-node-num">' + (i + 1) + '</span>' +
          '<div class="defend-node-label">' + rd.phase + '</div>';
        timeline.appendChild(node);
      });
      playRound(0);
    });

    function playRound(index) {
      if (index >= rounds.length) {
        showResult();
        return;
      }
      var round = rounds[index];
      var nodes = root.querySelectorAll('.defend-node');
      nodes.forEach(function (n, i) {
        n.classList.remove('active');
        if (i === index) n.classList.add('active');
      });

      var shuffled = shuffle(round.options);
      var letters = ['A', 'B', 'C', 'D'];
      scenario.innerHTML =
        '<div class="defend-alert">' +
          '<div class="defend-alert-header">' +
            '<span class="defend-alert-badge"><span class="defend-alert-dot"></span>INCOMING THREAT</span>' +
            '<span class="defend-alert-phase">Phase ' + (index + 1) + ': ' + round.phase + '</span>' +
          '</div>' +
          '<p class="defend-alert-text">' + round.alert + '</p>' +
        '</div>' +
        '<div class="defend-prompt">Choose your defensive response:</div>' +
        '<div class="defend-options">' +
          shuffled.map(function (opt, i) {
            return '<button type="button" class="defend-option" ' +
                   'data-option-id="' + opt.id + '" ' +
                   'data-correct="' + (opt.correct ? 'true' : 'false') + '">' +
                   '<span class="defend-option-marker">' + letters[i] + '</span>' +
                   '<span class="defend-option-text">' + opt.text + '</span>' +
                   '</button>';
          }).join('') +
        '</div>';

      scenario.querySelectorAll('.defend-option').forEach(function (btn) {
        btn.addEventListener('click', function () { handleChoice(btn, index); }, { once: true });
      });
    }

    function handleChoice(btn, index) {
      var isCorrect = btn.dataset.correct === 'true';
      var nodes = root.querySelectorAll('.defend-node');

      scenario.querySelectorAll('.defend-option').forEach(function (b) {
        b.classList.add('disabled');
        if (b.dataset.correct === 'true') b.classList.add('correct');
      });
      btn.classList.add(isCorrect ? 'correct' : 'incorrect');
      nodes[index].classList.remove('active');
      nodes[index].classList.add(isCorrect ? 'defended' : 'breached');

      picks[String(index)] = btn.dataset.optionId;
      setSubmission(picks);

      setTimeout(function () { playRound(index + 1); }, 1100);
    }

    function showResult() {
      finished = true;
      var correct = 0;
      rounds.forEach(function (rd, i) {
        var picked = rd.options.find(function (o) { return o.id === picks[String(i)]; });
        if (picked && picked.correct) correct++;
      });

      var msg, emoji;
      if (correct === rounds.length) { msg = 'Perfect defense! The attack was completely neutralized.'; emoji = '\u{1F6E1}'; }
      else if (correct >= 3)         { msg = 'You blocked ' + correct + ' of ' + rounds.length + ' phases. The attacker still caused some damage.'; emoji = '\u26A0'; }
      else                           { msg = 'Only ' + correct + ' of ' + rounds.length + ' phases blocked. The attacker achieved their objective.'; emoji = '\u{1F6A8}'; }

      scenario.innerHTML =
        '<div class="defend-result-card">' +
          '<div class="defend-result-emoji">' + emoji + '</div>' +
          '<div class="defend-result-score">' + correct + '/' + rounds.length + '</div>' +
          '<div class="defend-result-label">Phases Defended</div>' +
          '<p class="defend-result-msg">' + msg + '</p>' +
        '</div>';
      updateSubmitEnabled();
    }

    return {
      valid: function () { return finished; }
    };
  }

  /* ------------------------------------------------------------
     Shared plumbing: submission field + submit button gating
     ------------------------------------------------------------ */
  var currentValidator = null;

  function setSubmission(value) {
    var field = document.getElementById('quizSubmissionField');
    if (!field) return;
    field.value = JSON.stringify(value);
    updateSubmitEnabled();
  }

  function updateSubmitEnabled() {
    var btn = document.getElementById('quizSubmitBtn');
    if (!btn) return;
    var ok = currentValidator ? !!currentValidator() : false;
    btn.disabled = !ok;
  }

  // Fallback CSS.escape for older engines (safe for simple inputs).
  function cssEscape(s) {
    if (window.CSS && window.CSS.escape) return window.CSS.escape(s);
    return String(s).replace(/[^a-zA-Z0-9_-]/g, function (ch) {
      return '\\' + ch;
    });
  }

  /* ------------------------------------------------------------
     Boot
     ------------------------------------------------------------ */
  $(function () {
    var root = document.querySelector('.quiz-challenge');
    if (!root) return;

    var challenge = readJson(root, 'data-challenge', null);
    var correctOrder = readJson(root, 'data-correct-order', []);
    var saved = readJson(root, 'data-saved-submission', null);
    if (!challenge) return;

    var handle;
    if (challenge.type === 'order')       handle = initOrder(root, challenge, correctOrder, saved);
    else if (challenge.type === 'match')  handle = initMatch(root, challenge, correctOrder, saved);
    else if (challenge.type === 'defend') handle = initDefend(root, challenge);

    currentValidator = handle && handle.valid ? handle.valid : function () { return false; };
    updateSubmitEnabled();
  });

})(window.jQuery);
