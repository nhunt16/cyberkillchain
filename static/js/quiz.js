/* ============================================================
   QUIZ · two-challenge interactive flow
   ------------------------------------------------------------
   Each quiz page mounts exactly one `.quiz-challenge` node whose
   data-* attributes carry the JSON config for the challenge and
   any previously-saved submission. This module reads that config,
   initializes the correct interaction (the attacker-workbench
   plan-the-breach flow or the defend-simulation click flow),
   keeps a running "submission" object, and serializes it into a
   hidden input on the form so the Flask backend can grade +
   persist it. Uses jQuery per course requirement.
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
     Challenge 1 · Plan the Breach (attacker workbench)
     ------------------------------------------------------------
     Five sequential decisions (target → pretext → channel → lure
     → payload). Each step renders option cards; picking one
     reveals an intel rationale ribbon and unlocks "Next". After
     the last pick we show an ATTACK DOSSIER recap and the quiz
     submit button is enabled. Honors saved submissions so the
     back-button still reflects prior picks. */
  function initAttackPlan(root, challenge, saved) {
    var stepper = root.querySelector('#attackStepper');
    var stage = root.querySelector('#attackStage');
    if (!stepper || !stage) return null;

    var steps = Array.isArray(challenge.steps) ? challenge.steps : [];
    if (!steps.length) return null;

    var picks = (saved && typeof saved === 'object' && !Array.isArray(saved))
      ? Object.assign({}, saved)
      : {};

    var currentIdx = 0;
    for (var i = 0; i < steps.length; i++) {
      if (!picks[steps[i].id]) { currentIdx = i; break; }
      if (i === steps.length - 1) currentIdx = steps.length;
    }

    function optionById(step, id) {
      for (var i = 0; i < (step.options || []).length; i++) {
        if (step.options[i].id === id) return step.options[i];
      }
      return null;
    }

    function renderStepper() {
      stepper.innerHTML = '';
      steps.forEach(function (step, i) {
        var pill = document.createElement('div');
        var state = 'pending';
        if (picks[step.id]) state = 'done';
        else if (i === currentIdx) state = 'current';
        pill.className = 'attack-step-pill is-' + state;
        pill.innerHTML =
          '<span class="attack-step-pill-num">' + (i + 1) + '</span>' +
          '<span class="attack-step-pill-label">' + step.label + '</span>';
        stepper.appendChild(pill);
        if (i < steps.length - 1) {
          var track = document.createElement('span');
          track.className = 'attack-step-track' + (picks[step.id] ? ' is-done' : '');
          stepper.appendChild(track);
        }
      });
    }

    function renderStep(idx) {
      currentIdx = idx;
      renderStepper();
      var step = steps[idx];
      var existing = picks[step.id];

      var optionsHtml = (step.options || []).map(function (opt) {
        var chipsHtml = (opt.chips || []).map(function (c) {
          return '<li class="attack-chip">' + escapeHtml(c) + '</li>';
        }).join('');
        var isPicked = existing === opt.id;
        return (
          '<button type="button" class="attack-card' + (isPicked ? ' is-picked' : '') + '" ' +
                  'data-option-id="' + opt.id + '" ' +
                  'data-correct="' + (opt.correct ? 'true' : 'false') + '">' +
            '<div class="attack-card-head">' +
              '<div class="attack-card-titles">' +
                '<div class="attack-card-title">' + escapeHtml(opt.title) + '</div>' +
                (opt.subtitle ? '<div class="attack-card-subtitle">' + escapeHtml(opt.subtitle) + '</div>' : '') +
              '</div>' +
              '<div class="attack-card-cta">Select</div>' +
            '</div>' +
            (chipsHtml ? '<ul class="attack-chips">' + chipsHtml + '</ul>' : '') +
          '</button>'
        );
      }).join('');

      stage.innerHTML =
        '<div class="attack-step-panel" data-step-id="' + step.id + '">' +
          '<div class="attack-step-head">' +
            '<span class="attack-step-kicker">STEP ' + (idx + 1) + ' / ' + steps.length + ' · ' + escapeHtml(step.label) + '</span>' +
            '<h4 class="attack-step-heading">' + escapeHtml(step.heading) + '</h4>' +
            '<p class="attack-step-prompt">' + escapeHtml(step.prompt) + '</p>' +
          '</div>' +
          '<div class="attack-card-grid">' + optionsHtml + '</div>' +
          '<div class="attack-intel" id="attackIntel" hidden>' +
            '<div class="attack-intel-head">' +
              '<span class="attack-intel-badge"><span class="attack-intel-dot"></span>INTEL</span>' +
              '<span class="attack-intel-verdict" id="attackIntelVerdict"></span>' +
            '</div>' +
            '<p class="attack-intel-text" id="attackIntelText"></p>' +
            '<button type="button" class="attack-next-btn" id="attackNextBtn"></button>' +
          '</div>' +
        '</div>';

      stage.querySelectorAll('.attack-card').forEach(function (card) {
        card.addEventListener('click', function () { handlePick(step, card); });
      });

      if (existing) {
        var picked = stage.querySelector('.attack-card[data-option-id="' + cssEscape(existing) + '"]');
        if (picked) revealIntel(step, picked, { skipAnimate: true });
      }
    }

    function handlePick(step, card) {
      if (stage.querySelector('.attack-card.is-picked')) return;
      var optId = card.dataset.optionId;
      picks[step.id] = optId;
      setSubmission(picks);
      revealIntel(step, card, { skipAnimate: false });
    }

    function revealIntel(step, card, opts) {
      var optId = card.dataset.optionId;
      var opt = optionById(step, optId);
      var isCorrect = !!(opt && opt.correct);
      var panel = stage.querySelector('.attack-step-panel');
      if (panel) panel.classList.add('is-committed');

      stage.querySelectorAll('.attack-card').forEach(function (c) {
        c.disabled = true;
        c.classList.remove('is-picked', 'is-correct', 'is-incorrect', 'is-faded');
        var cId = c.dataset.optionId;
        if (cId === optId) {
          c.classList.add('is-picked', isCorrect ? 'is-correct' : 'is-incorrect');
        } else if (c.dataset.correct === 'true') {
          c.classList.add('is-correct');
        } else {
          c.classList.add('is-faded');
        }
      });

      var intel = stage.querySelector('#attackIntel');
      var verdict = stage.querySelector('#attackIntelVerdict');
      var text = stage.querySelector('#attackIntelText');
      var btn = stage.querySelector('#attackNextBtn');
      if (!intel || !verdict || !text || !btn) return;

      verdict.textContent = isCorrect ? 'VIABLE' : 'BURNED';
      verdict.className = 'attack-intel-verdict ' + (isCorrect ? 'is-ok' : 'is-bad');
      text.textContent = opt && opt.rationale ? opt.rationale : '';
      intel.hidden = false;
      if (!opts || !opts.skipAnimate) {
        intel.classList.remove('anim-in');
        void intel.offsetWidth;
        intel.classList.add('anim-in');
      }

      var isLast = currentIdx === steps.length - 1;
      btn.textContent = isLast ? 'Assemble dossier →' : 'Next step: ' + steps[currentIdx + 1].label + ' →';
      btn.onclick = function () {
        if (isLast) {
          renderDossier();
        } else {
          renderStep(currentIdx + 1);
        }
      };
    }

    function renderDossier() {
      currentIdx = steps.length;
      renderStepper();
      var rows = steps.map(function (step) {
        var pickedId = picks[step.id];
        var opt = optionById(step, pickedId);
        var correct = opt && opt.correct;
        return (
          '<li class="dossier-row ' + (correct ? 'is-correct' : 'is-incorrect') + '">' +
            '<span class="dossier-row-phase">' + escapeHtml(step.label) + '</span>' +
            '<span class="dossier-row-pick">' + escapeHtml(opt ? opt.title : '—') + '</span>' +
            '<span class="dossier-row-verdict">' + (correct ? 'viable' : 'burned') + '</span>' +
          '</li>'
        );
      }).join('');

      var hits = steps.filter(function (s) {
        var o = optionById(s, picks[s.id]);
        return o && o.correct;
      }).length;
      var total = steps.length;

      var banner, bannerClass;
      if (hits === total) {
        banner = 'Operation clean. Payload detonated, C2 live, defenders blind.';
        bannerClass = 'is-success';
      } else if (hits >= Math.ceil(total * 0.6)) {
        banner = 'Partial success. ' + (total - hits) + ' step' + (total - hits === 1 ? '' : 's') + ' tripped defenders — SOC is now hunting you.';
        bannerClass = 'is-warn';
      } else {
        banner = 'Operation burned. ' + (total - hits) + ' critical failures. The blue team is reading your playbook.';
        bannerClass = 'is-bad';
      }

      stage.innerHTML =
        '<div class="attack-dossier ' + bannerClass + '">' +
          '<div class="dossier-head">' +
            '<span class="dossier-kicker">ATTACK DOSSIER</span>' +
            '<h4 class="dossier-title">Operation: ACME / Mike Smith</h4>' +
            '<p class="dossier-banner">' + escapeHtml(banner) + '</p>' +
          '</div>' +
          '<ol class="dossier-list">' + rows + '</ol>' +
          '<div class="dossier-score">' +
            '<span class="dossier-score-num">' + hits + ' / ' + total + '</span>' +
            '<span class="dossier-score-label">decisions viable</span>' +
          '</div>' +
          '<button type="button" class="attack-reset-btn" id="attackResetBtn">Reset plan</button>' +
        '</div>';

      var reset = stage.querySelector('#attackResetBtn');
      if (reset) reset.addEventListener('click', resetAll);
      updateSubmitEnabled();
    }

    function resetAll() {
      picks = {};
      setSubmission(picks);
      renderStep(0);
    }

    if (currentIdx >= steps.length) {
      renderDossier();
    } else {
      renderStep(currentIdx);
    }

    setSubmission(picks);

    return {
      valid: function () {
        for (var i = 0; i < steps.length; i++) {
          if (!picks[steps[i].id]) return false;
        }
        return true;
      }
    };
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ------------------------------------------------------------
     Legacy · Reconstruct the Kill Chain (drag-to-reorder)
     Kept for backward-compat with any order-type challenge
     content, though the default quiz now opens with attack_plan.
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
     Challenge 2 · Defend the Network (5-round simulation)
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
    if (challenge.type === 'attack_plan') handle = initAttackPlan(root, challenge, saved);
    else if (challenge.type === 'order')  handle = initOrder(root, challenge, correctOrder, saved);
    else if (challenge.type === 'defend') handle = initDefend(root, challenge);

    currentValidator = handle && handle.valid ? handle.valid : function () { return false; };
    updateSubmitEnabled();
  });

})(window.jQuery);
