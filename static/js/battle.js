/* ============================================================
   QUIZ · Final Battle (race the kill chain)
   ------------------------------------------------------------
   The single quiz challenge today is `battle`: the user's active
   avatar (Red Team) tries to walk all five phases of the cyber
   kill chain on Inu — the SOC's blue-team boss — before Inu's
   Detection meter saturates or the engagement window (turn cap)
   runs out.

   Two competing trackers replace HP:

     * Kill chain (Red): five phases (P1..P5). Each phase has a
       progress bar that fills based on the verdict of the move:
       strong  -> +100  (phase clears in one move)
       neutral -> +50
       weak    -> +20   (and a big detection penalty)
       miss    -> +0    (still costs detection)

     * Detection (Blue): a 0..100 meter that climbs every turn
       from your move + Inu's per-phase opponent_move + a one-shot
       "Incident Response" panic button when detection crosses
       `ir_threshold`.

   Win   = clear phase 5 (the last move taken determines the
           victory flavor: Exfil / Ransom / Wipe).
   Lose  = detection >= detection_max OR turn > max_turns.

   Inu's posture follows the player's CURRENT phase (not the turn
   counter), so if you stall on P1 his posture stays HONEY — the
   posture<->phase mapping the lessons taught is preserved as
   stable signal.

   The whole rules table lives in data/content.json; this file
   just executes whatever it's handed.

   Uses jQuery per the course requirement.
   ============================================================ */

(function ($) {
  'use strict';

  /* ------------------------------------------------------------
     Tiny utilities
     ------------------------------------------------------------ */
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function readJson(el, attr, fallback) {
    var raw = el.getAttribute(attr);
    if (!raw) return fallback;
    try { return JSON.parse(raw); } catch (e) { return fallback; }
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /* ------------------------------------------------------------
     The battle controller. Returns a small handle so the boot
     code in this file can wire it up to the quiz form.
     ------------------------------------------------------------ */
  function initBattle(root, challenge, formEl) {
    var spec = challenge && challenge.battle;
    if (!spec) return null;

    // ---- DOM refs ----
    var workbench = root.querySelector('#battleWorkbench');
    if (!workbench) return null;
    var poseBase = workbench.getAttribute('data-pose-base') || '/static/assets/';
    var playerPrefix = workbench.getAttribute('data-player-prefix') || 'mascot';
    var oppPrefix    = workbench.getAttribute('data-opp-prefix')    || 'inu';
    var oppName      = workbench.getAttribute('data-opp-name')      ||
                       (spec.opponent && spec.opponent.name) || 'Boss';
    // Prefer the user's currently selected avatar name for the player slot;
    // fall back to whatever the spec says.
    var playerLabel  = (window.__ACTIVE_AVATAR_NAME__) ||
                       (spec.player && spec.player.name) || 'You';

    var playerEl     = root.querySelector('#battlePlayer');
    var playerImg    = playerEl && playerEl.querySelector('.battle-combatant-img');
    var playerFloats = playerEl && playerEl.querySelector('.battle-combatant-floats');
    var playerName   = root.querySelector('#battlePlayerName');

    var oppEl     = root.querySelector('#battleOpponent');
    var oppImg    = oppEl && oppEl.querySelector('.battle-combatant-img');
    var oppFloats = oppEl && oppEl.querySelector('.battle-combatant-floats');

    var killchainEl  = root.querySelector('#battleKillchain');
    var killchainTiles = killchainEl
      ? Array.prototype.slice.call(killchainEl.querySelectorAll('.battle-killchain-tile'))
      : [];

    var detectionFill = root.querySelector('#battleDetectionFill');
    var detectionVal  = root.querySelector('#battleDetectionVal');
    var detectionMax  = root.querySelector('#battleDetectionMax');
    var turnMeter     = root.querySelector('#battleTurnMeter');

    var postureKicker = root.querySelector('#battlePostureKicker');
    var postureNameEl = root.querySelector('#battlePostureName');
    var postureBlurb  = root.querySelector('#battlePostureBlurb');
    var postureTile   = root.querySelector('#battlePostureTile');

    var logList       = root.querySelector('#battleLog');
    var logWrap       = root.querySelector('#battleLogWrap');
    var logToggle     = root.querySelector('#battleLogToggle');
    var logCount      = root.querySelector('#battleLogCount');
    var turnIndicator = root.querySelector('#battleTurnIndicator');
    var movesContainer= root.querySelector('#battleMoves');
    var movesHint     = root.querySelector('#battleMovesHint');

    var overlay        = root.querySelector('#battleOverlay');
    var overlayCard    = root.querySelector('#battleOverlayCard');
    var overlayKicker  = root.querySelector('#battleOverlayKicker');
    var overlayTitle   = root.querySelector('#battleOverlayTitle');
    var overlayText    = root.querySelector('#battleOverlayText');
    var overlayReset   = root.querySelector('#battleResetBtn');
    var overlayFinish  = root.querySelector('#battleFinishBtn');
    var overlayFinishLabel = root.querySelector('#battleFinishLabel');

    var showcaseRoot   = workbench.querySelector('#battleMoveShowcase');
    var showcaseSkip   = workbench.querySelector('#battleShowcaseSkip');
    var showcaseKicker = workbench.querySelector('#battleShowcaseKicker');
    var showcaseTitleEl= workbench.querySelector('#battleShowcaseTitle');
    var showcaseResult = workbench.querySelector('#battleShowcaseResult');
    var showcaseScenes = workbench.querySelectorAll('.battle-move-scene');
    var showcaseActorImg  = workbench.querySelector('#battleShowcaseActorImg');
    var showcaseActorName = workbench.querySelector('#battleShowcaseActorName');
    var showcaseStage = workbench.querySelector('#battleShowcaseStage');

    var submissionField = formEl && formEl.querySelector('#quizSubmissionField');
    var submitBtn = document.getElementById('quizSubmitBtn');

    // ---- Static lookups derived from the spec ----
    var rules = spec.rules || {};
    var maxTurns      = rules.max_turns      || 12;
    var detectionCap  = rules.detection_max  || 100;
    var irThreshold   = rules.ir_threshold   || 65;
    var progressTable = rules.progress       || { strong: 100, neutral: 50, weak: 20, miss: 0 };
    var detectionTable= rules.detection_cost || { strong: 5, neutral: 12, weak: 20, miss: 14 };

    var postures = spec.postures || [];
    var posturesById = {};
    postures.forEach(function (p) { posturesById[p.id] = p; });

    var phases = spec.phases || [];
    var phaseCount = phases.length || 1;
    // Build a flat lookup of every player move across all phases so
    // the recon "reveal_next" peek can resolve a move id without
    // knowing the phase.
    var allMovesById = {};
    phases.forEach(function (ph) {
      (ph.player_moves || []).forEach(function (m) { allMovesById[m.id] = m; });
    });
    var irMove = (spec.opponent && spec.opponent.ir_move) || null;
    var objectiveOutcomes = spec.objective_outcomes || {};
    var defeatModes       = spec.defeat_modes       || {};

    function poseFile(prefix, expr) {
      // Legacy: Neko's "happy" file is "<prefix>-base-happy"; everything
      // else follows "<prefix>-<expr>" so the same pattern works for Inu
      // (and any future avatar) without renaming Neko's existing PNGs.
      if (expr === 'happy') return prefix + '-base-happy-transparent.png';
      return prefix + '-' + expr + '-transparent.png';
    }
    function buildPoseMap(prefix) {
      return {
        happy:    poseBase + poseFile(prefix, 'happy'),
        excited:  poseBase + poseFile(prefix, 'excited'),
        teaching: poseBase + poseFile(prefix, 'teaching'),
        thinking: poseBase + poseFile(prefix, 'thinking'),
        worried:  poseBase + poseFile(prefix, 'worried')
      };
    }
    var PLAYER_POSES = buildPoseMap(playerPrefix);
    var OPP_POSES    = buildPoseMap(oppPrefix);

    // ---- Mutable battle state ----
    var state;
    var showcaseOpen = false;
    var showcaseTimer = null;
    var pendingShowcasePlan = null;

    function newState() {
      return {
        turn: 1,
        phaseIdx: 0,           // 0..(phaseCount-1); current phase the player is attacking
        phaseProgress: 0,      // 0..100, current-phase fill
        phasesCleared: 0,      // 0..phaseCount; how many phases have been completed
        detection: 0,          // 0..detectionCap
        posture: null,
        currentMoves: [],
        irUsed: false,
        log: [],
        turns: [],             // graded turn entries
        previewedNext: null,   // posture peeked via Recon's reveal_next
        finished: false,
        victory: false,
        victoryMode: null,     // 'exfil' | 'ransom' | 'wipe' | null
        defeatMode: null       // 'detection' | 'timeout' | null
      };
    }

    /* ------------------------------------------------------------
       Rendering — kill-chain & detection meters
       ------------------------------------------------------------ */

    function renderKillchain() {
      killchainTiles.forEach(function (tile, i) {
        var fill = tile.querySelector('.battle-killchain-progress-fill');
        var pct;
        if (i < state.phasesCleared) {
          tile.dataset.tileState = 'cleared';
          pct = 100;
        } else if (i === state.phaseIdx && state.phasesCleared < phaseCount) {
          tile.dataset.tileState = 'active';
          pct = clamp(state.phaseProgress, 0, 100);
        } else {
          tile.dataset.tileState = 'pending';
          pct = 0;
        }
        if (fill) fill.style.width = pct.toFixed(1) + '%';
      });
    }

    function renderDetection() {
      var pct = clamp((state.detection / detectionCap) * 100, 0, 100);
      if (detectionFill) detectionFill.style.width = pct.toFixed(1) + '%';
      if (detectionVal)  detectionVal.textContent = String(Math.round(state.detection));
      if (detectionFill) {
        detectionFill.classList.toggle('is-mid',  pct >= 35 && pct < irThreshold);
        detectionFill.classList.toggle('is-high', pct >= irThreshold && pct < 100);
        detectionFill.classList.toggle('is-max',  pct >= 100);
      }
    }

    function renderTurnMeter() {
      var label = 'Turn ' + state.turn + ' / ' + maxTurns;
      if (turnMeter) turnMeter.textContent = label;
      if (turnIndicator) turnIndicator.textContent = label;
    }

    function setPose(imgEl, expr, side) {
      var poses = (side === 'opp') ? OPP_POSES : PLAYER_POSES;
      var src = poses[expr] || poses.happy;
      if (imgEl && imgEl.getAttribute('src') !== src) {
        imgEl.setAttribute('src', src);
      }
    }

    function setPosture(postureId) {
      state.posture = postureId;
      var p = posturesById[postureId];
      if (!p) {
        postureKicker.textContent = '—';
        postureNameEl.textContent = 'awaiting first move';
        postureBlurb.textContent = oppName + ' steps onto the field. Pick your opening move.';
        postureTile.dataset.posture = '';
        return;
      }
      postureKicker.textContent = p.kicker || p.id;
      postureNameEl.textContent = p.name || p.id;
      postureBlurb.textContent = p.blurb || '';
      postureTile.dataset.posture = p.id;
      decorateMoveButtons();
    }

    function updateLogCount() {
      if (!logCount) return;
      var n = logList ? logList.children.length : 0;
      logCount.textContent = n + (n === 1 ? ' entry' : ' entries');
    }

    function appendLog(line, kind) {
      var li = document.createElement('li');
      li.className = 'battle-log-line' + (kind ? ' battle-log-line--' + kind : '');
      li.innerHTML = line;
      logList.appendChild(li);
      logList.scrollTop = logList.scrollHeight;
      state.log.push({ text: li.textContent, kind: kind || 'info' });
      updateLogCount();
    }

    function setLogCollapsed(collapsed) {
      if (!logWrap || !logToggle) return;
      logWrap.dataset.collapsed = collapsed ? 'true' : 'false';
      logToggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      if (!collapsed && logList) {
        logList.scrollTop = logList.scrollHeight;
      }
    }

    function floatNumber(host, text, kind) {
      if (!host) return;
      var el = document.createElement('span');
      el.className = 'battle-float battle-float--' + (kind || 'damage');
      el.textContent = text;
      host.appendChild(el);
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 1100);
    }

    function shake(el) {
      if (!el) return;
      el.classList.remove('is-hit');
      // force reflow so the animation can re-trigger
      void el.offsetWidth;
      el.classList.add('is-hit');
    }

    /* ------------------------------------------------------------
       Move buttons — render & decorate the per-phase palette
       ------------------------------------------------------------ */

    function moveStrengthVsCurrentPosture(move) {
      if (!move || !state.posture) return 'neutral';
      if (move.strong_vs && move.strong_vs === state.posture) return 'strong';
      if (move.weak_vs && move.weak_vs === state.posture) return 'weak';
      return 'neutral';
    }

    function renderMovesForPhase(phase) {
      movesContainer.innerHTML = '';
      var moves = (phase && phase.player_moves) || [];
      state.currentMoves = moves;
      moves.forEach(function (m) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'battle-move-btn';
        btn.dataset.moveId = m.id;
        if (m.phase) btn.dataset.phase = m.phase;
        var phaseBadge = m.phase
          ? '<span class="battle-move-phase" title="Kill chain phase ' + m.phase + '">P' + m.phase + '</span>'
          : '';
        btn.innerHTML =
          '<span class="battle-move-head">' +
            phaseBadge +
            '<span class="battle-move-kicker">' + escapeHtml(m.kicker || m.id) + '</span>' +
          '</span>' +
          '<span class="battle-move-name">' + escapeHtml(m.name) + '</span>' +
          '<span class="battle-move-tagline">' + escapeHtml(m.tagline || '') + '</span>' +
          '<span class="battle-move-strength" data-strength="neutral">vs current posture</span>';
        btn.addEventListener('click', function () { onMoveClicked(m); });
        movesContainer.appendChild(btn);
      });
      decorateMoveButtons();
    }

    function decorateMoveButtons() {
      var children = movesContainer.querySelectorAll('.battle-move-btn');
      children.forEach(function (btn) {
        var move = null;
        for (var i = 0; i < state.currentMoves.length; i++) {
          if (state.currentMoves[i].id === btn.dataset.moveId) {
            move = state.currentMoves[i]; break;
          }
        }
        if (!move) return;
        var strength = moveStrengthVsCurrentPosture(move);
        btn.dataset.strength = strength;
        var chip = btn.querySelector('.battle-move-strength');
        if (chip) {
          chip.dataset.strength = strength;
          if (!state.posture) {
            chip.textContent = 'awaiting posture';
          } else if (strength === 'strong') {
            chip.textContent = 'Strong vs ' + (posturesById[state.posture] || {}).name;
          } else if (strength === 'weak') {
            chip.textContent = 'Weak vs '   + (posturesById[state.posture] || {}).name;
          } else {
            chip.textContent = 'Neutral';
          }
        }

        var disabledReason = state.finished ? 'Battle over' : (showcaseOpen ? 'Animating' : '');
        btn.disabled = !!disabledReason;
        btn.dataset.disabledReason = disabledReason;
        btn.classList.toggle('is-disabled', !!disabledReason);

        if (disabledReason) {
          btn.setAttribute('title', disabledReason);
        } else if (chip) {
          btn.setAttribute('title', move.name + ' — ' + (move.tagline || ''));
        }
      });
    }

    function setMovesEnabled(enabled) {
      Array.prototype.forEach.call(movesContainer.children, function (btn) {
        btn.disabled = !enabled || btn.classList.contains('is-disabled');
      });
    }

    /* ------------------------------------------------------------
       Turn flow — plan → move showcase (~5s) → apply
       ------------------------------------------------------------ */

    // Two-phase showcase: scene plays, then a result reveal lands so
    // the user clearly sees how the attack landed.
    var SCENE_MS  = 6500;
    var RESULT_MS = 3200;
    var SHOWCASE_MS = SCENE_MS + RESULT_MS;
    var SHOWCASE_MS_REDUCED = 700;
    var showcaseSceneTimer = null;

    function prefersReducedMotion() {
      return window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    // Pure-data resolution of a player's move into the deltas applied
    // to the two trackers. Centralising this keeps the rules table in
    // content.json the single source of truth.
    function resolveOutcome(move, hit, strength) {
      if (!hit) {
        return {
          progress: progressTable.miss || 0,
          detection: detectionTable.miss || 0,
          verdict: 'miss'
        };
      }
      return {
        progress: progressTable[strength] != null ? progressTable[strength] : 0,
        detection: detectionTable[strength] != null ? detectionTable[strength] : 0,
        verdict: strength
      };
    }

    function buildOpponentTurnPlan() {
      var pick = chooseOpponentMove();
      var oppMove = pick.move;
      if (!oppMove) return null;
      return {
        side: 'opponent',
        move: oppMove,
        isIr: pick.isIr,
        detectionAdd: oppMove.detection || 0
      };
    }

    function buildPlayerTurnPlan(move) {
      var posture = state.posture;
      var postureName = (posturesById[posture] || {}).name || '—';
      var strength = moveStrengthVsCurrentPosture(move);
      var accuracy = (move.accuracy == null) ? 1 : move.accuracy;
      var hit = Math.random() < accuracy;
      var outcome = resolveOutcome(move, hit, strength);
      var beforePhase = state.phaseIdx;
      var newProg = clamp(state.phaseProgress + outcome.progress, 0, 100);
      var phaseClearedNow = newProg >= 100;

      var logMain = { html: '', kind: 'info' };
      if (!hit) {
        logMain.html =
          '<strong>You ▸ ' + escapeHtml(move.name) + '.</strong> ' +
          escapeHtml(move.flavor || 'no progress.') +
          ' <em>+' + outcome.detection + ' detection.</em>';
        logMain.kind = 'miss';
      } else if (strength === 'strong') {
        logMain.html =
          '<strong>Critical Insight! You ▸ ' + escapeHtml(move.name) + '</strong> · ' +
          '<em>phase ' + (beforePhase + 1) + ' cleared.</em> ' +
          escapeHtml(move.strong_flavor || move.flavor || '');
        logMain.kind = 'crit';
      } else if (strength === 'weak') {
        logMain.html =
          '<strong>You ▸ ' + escapeHtml(move.name) + '</strong> · ' +
          '<em>+' + outcome.progress + '% phase</em>, ' +
          '<em>+' + outcome.detection + ' detection.</em> ' +
          escapeHtml(move.weak_flavor || move.flavor || (oppName + ' shrugs it off.'));
        logMain.kind = 'weak';
      } else {
        logMain.html =
          '<strong>You ▸ ' + escapeHtml(move.name) + '</strong> · ' +
          '<em>+' + outcome.progress + '% phase</em>, ' +
          '<em>+' + outcome.detection + ' detection.</em> ' +
          escapeHtml(move.flavor || '');
        logMain.kind = 'info';
      }

      var revealLog = null;
      var revealNextPostureId = null;
      if (move.reveal_next && hit) {
        var nextPhase = phases[state.phaseIdx + 1];
        var nextPostureId = nextPhase && nextPhase.posture;
        if (nextPostureId && posturesById[nextPostureId]) {
          revealNextPostureId = nextPostureId;
          revealLog = {
            html: 'Intel: ' + escapeHtml(oppName) + ' will pivot to <strong>' +
              escapeHtml(posturesById[nextPostureId].name) + '</strong> next phase.',
            kind: 'recon'
          };
        }
      }

      var turnEntry = {
        turn: state.turn,
        move_id: move.id,
        move_name: move.name,
        posture: posture,
        posture_name: postureName,
        verdict: outcome.verdict,
        progress_added: outcome.progress,
        detection_added: outcome.detection,
        phase_cleared: phaseClearedNow,
        phase_idx_before: beforePhase,
        hit: hit,
        objective: move.objective || null
      };

      return {
        side: 'player',
        move: move,
        posture: posture,
        postureName: postureName,
        strength: strength,
        hit: hit,
        outcome: outcome,
        beforePhase: beforePhase,
        phaseClearedNow: phaseClearedNow,
        logMain: logMain,
        revealLog: revealLog,
        revealNextPostureId: revealNextPostureId,
        turnEntry: turnEntry
      };
    }

    function verdictPillClass(plan) {
      if (!plan.hit || plan.outcome.verdict === 'miss') return 'is-miss';
      if (plan.strength === 'strong') return 'is-crit';
      if (plan.strength === 'weak') return 'is-weak';
      return 'is-neutral';
    }

    function verdictPillText(plan) {
      if (!plan.hit || plan.outcome.verdict === 'miss') return 'Missed';
      if (plan.strength === 'strong') return 'Critical Insight';
      if (plan.strength === 'weak') return 'Weak pick';
      return 'Neutral';
    }

    function effectivenessFor(plan) {
      if (plan.side === 'opponent') {
        if (plan.isIr) {
          return { tone: 'ir',      label: "DETECTED — IR ACTIVATED" };
        }
        return     { tone: 'defense', label: "DEFENDED" };
      }
      if (!plan.hit || plan.outcome.verdict === 'miss') {
        return { tone: 'miss', label: 'MISSED' };
      }
      if (plan.phaseClearedNow) {
        return { tone: 'crit', label: 'PHASE CLEARED!' };
      }
      if (plan.strength === 'strong') {
        return { tone: 'crit', label: "IT'S SUPER EFFECTIVE!" };
      }
      if (plan.strength === 'weak') {
        return { tone: 'weak', label: "NOT VERY EFFECTIVE" };
      }
      return     { tone: 'neutral', label: "IT'S EFFECTIVE" };
    }

    function populateShowcaseResult(plan) {
      if (!showcaseResult) return;
      var eff = effectivenessFor(plan);
      var stats = '';
      if (plan.side === 'opponent') {
        var detAdd = plan.detectionAdd || 0;
        stats =
          '<span class="battle-showcase-stat is-bad mono">+' + detAdd + ' detection on you</span>';
      } else {
        var pc = plan.outcome.progress;
        var det = plan.outcome.detection;
        var progressClass = pc > 0 ? 'is-good' : 'is-muted';
        var detClass = det > 0 ? 'is-bad' : 'is-muted';
        stats =
          '<span class="battle-showcase-stat ' + progressClass + ' mono">+' + pc + '% phase</span>' +
          '<span class="battle-showcase-stat ' + detClass + ' mono">+' + det + ' detection</span>';
      }
      showcaseResult.innerHTML =
        '<div class="battle-showcase-result-inner">' +
          '<div class="battle-showcase-effect" data-tone="' + eff.tone + '">' +
            '<span class="battle-showcase-effect-label">' + escapeHtml(eff.label) + '</span>' +
          '</div>' +
          '<div class="battle-showcase-stats">' + stats + '</div>' +
        '</div>';
    }

    function hideAllShowcaseScenes() {
      Array.prototype.forEach.call(showcaseScenes, function (el) {
        el.hidden = true;
        el.classList.remove('is-playing');
      });
    }

    function clearShowcaseTimers() {
      if (showcaseTimer) { clearTimeout(showcaseTimer); showcaseTimer = null; }
      if (showcaseSceneTimer) { clearTimeout(showcaseSceneTimer); showcaseSceneTimer = null; }
    }

    function revealShowcaseResult() {
      if (!showcaseRoot || !showcaseOpen) return;
      showcaseRoot.dataset.showcaseStage = 'result';
    }

    function closeShowcaseThenApply(plan) {
      clearShowcaseTimers();
      if (!showcaseOpen) return;
      showcaseOpen = false;
      pendingShowcasePlan = null;
      if (showcaseRoot) {
        delete showcaseRoot.dataset.battleVerdict;
        delete showcaseRoot.dataset.battleSide;
        delete showcaseRoot.dataset.showcaseStage;
        showcaseRoot.classList.remove('is-open');
        showcaseRoot.hidden = true;
        showcaseRoot.setAttribute('aria-hidden', 'true');
      }
      hideAllShowcaseScenes();
      if (plan.side === 'opponent') {
        applyOpponentTurnPlan(plan);
      } else {
        applyPlayerTurnPlan(plan);
      }
    }

    function openMoveShowcase(plan) {
      if (!showcaseRoot || !showcaseKicker || !showcaseTitleEl) {
        if (plan.side === 'opponent') applyOpponentTurnPlan(plan);
        else applyPlayerTurnPlan(plan);
        return;
      }
      showcaseOpen = true;
      pendingShowcasePlan = plan;
      showcaseRoot.dataset.battleSide = plan.side === 'opponent' ? 'opponent' : 'player';
      if (plan.side === 'opponent') {
        showcaseRoot.dataset.battleVerdict = plan.isIr ? 'ir' : 'defense';
      } else {
        showcaseRoot.dataset.battleVerdict = plan.hit ? plan.strength : 'miss';
      }
      showcaseKicker.textContent = plan.move.kicker || plan.move.id;
      showcaseTitleEl.textContent = plan.move.name || 'Move';
      showcaseRoot.setAttribute('aria-labelledby', 'battleShowcaseTitle');

      if (showcaseActorName && showcaseActorImg) {
        var actorName = plan.side === 'opponent' ? oppName : playerLabel;
        var actorPrefix = plan.side === 'opponent' ? oppPrefix : playerPrefix;
        var actorPose = 'happy';
        if (plan.side === 'player') {
          if (!plan.hit || plan.outcome.verdict === 'miss') actorPose = 'worried';
          else if (plan.strength === 'strong') actorPose = 'excited';
          else if (plan.strength === 'weak') actorPose = 'worried';
          else actorPose = 'teaching';
        } else {
          actorPose = plan.isIr ? 'excited' : 'thinking';
        }
        showcaseActorName.textContent = actorName;
        showcaseActorImg.src = poseBase + poseFile(actorPrefix, actorPose);
        showcaseActorImg.alt = actorName + ' — ' + (plan.move.name || 'Move');
      }

      populateShowcaseResult(plan);
      hideAllShowcaseScenes();
      var sid = plan.move.id || 'generic';
      var scene = workbench.querySelector('.battle-move-scene[data-scene-id="' + sid + '"]');
      if (!scene) scene = workbench.querySelector('.battle-move-scene[data-scene-id="generic"]');
      if (scene) {
        scene.hidden = false;
        // reflow then animate
        void scene.offsetWidth;
        scene.classList.add('is-playing');
      }
      showcaseRoot.dataset.showcaseStage = 'playing';
      showcaseRoot.hidden = false;
      showcaseRoot.setAttribute('aria-hidden', 'false');
      requestAnimationFrame(function () {
        showcaseRoot.classList.add('is-open');
      });
      if (showcaseSkip) {
        try { showcaseSkip.focus(); } catch (e) { /* ignore */ }
      }

      clearShowcaseTimers();
      if (prefersReducedMotion()) {
        // Reduced motion: skip the long scene; reveal result immediately,
        // then auto-close after a short hold.
        revealShowcaseResult();
        showcaseTimer = setTimeout(function () {
          showcaseTimer = null;
          closeShowcaseThenApply(plan);
        }, SHOWCASE_MS_REDUCED);
        return;
      }

      showcaseSceneTimer = setTimeout(function () {
        showcaseSceneTimer = null;
        revealShowcaseResult();
      }, SCENE_MS);

      showcaseTimer = setTimeout(function () {
        showcaseTimer = null;
        closeShowcaseThenApply(plan);
      }, SHOWCASE_MS);
    }

    function applyPlayerTurnPlan(plan) {
      var move = plan.move;
      var outcome = plan.outcome;
      var hit = plan.hit;
      var strength = plan.strength;
      var beforePhase = plan.beforePhase;
      var phaseClearedNow = plan.phaseClearedNow;

      state.phaseProgress = clamp(state.phaseProgress + outcome.progress, 0, 100);
      state.detection = clamp(state.detection + outcome.detection, 0, detectionCap);

      if (phaseClearedNow) {
        state.phasesCleared = Math.min(state.phasesCleared + 1, phaseCount);
      }

      setPose(playerImg, strength === 'strong' ? 'excited' : (strength === 'weak' ? 'worried' : 'teaching'), 'player');
      if (hit && outcome.progress > 0) {
        floatNumber(playerFloats, '+' + outcome.progress + '% phase', strength === 'strong' ? 'crit' : 'progress');
      } else if (!hit) {
        floatNumber(playerFloats, 'MISS', 'miss');
      }
      if (outcome.detection > 0) {
        floatNumber(oppFloats, '+' + outcome.detection + ' DET', 'damage');
        shake(oppEl);
      }

      appendLog(plan.logMain.html, plan.logMain.kind);

      if (plan.revealLog && plan.revealNextPostureId) {
        state.previewedNext = plan.revealNextPostureId;
        appendLog(plan.revealLog.html, plan.revealLog.kind);
      }

      state.turns.push(plan.turnEntry);

      if (phaseClearedNow) {
        state.phaseIdx = Math.min(state.phaseIdx + 1, phaseCount);
        state.phaseProgress = 0;
      }

      renderKillchain();
      renderDetection();

      if (state.phasesCleared >= phaseCount) {
        state.victoryMode = move.objective || null;
        endBattle(true);
        return;
      }

      if (state.detection >= detectionCap) {
        state.defeatMode = 'detection';
        endBattle(false);
        return;
      }

      setTimeout(function () { runOpponentTurn(); }, 700);
    }

    function onMoveClicked(move) {
      if (state.finished || showcaseOpen) return;
      setMovesEnabled(false);
      var plan = buildPlayerTurnPlan(move);
      openMoveShowcase(plan);
    }

    function chooseOpponentMove() {
      // IR is a one-shot panic button: triggers the first time detection
      // crosses ir_threshold. Otherwise Inu uses the current phase's
      // themed response so the flavor matches what the player just did.
      if (irMove && !state.irUsed && state.detection >= irThreshold) {
        state.irUsed = true;
        return { move: irMove, isIr: true };
      }
      var phase = phases[state.phaseIdx] || phases[phaseCount - 1];
      return { move: phase && phase.opponent_move, isIr: false };
    }

    function runOpponentTurn() {
      if (state.finished) return;
      var plan = buildOpponentTurnPlan();
      if (!plan) {
        state.turn += 1;
        startTurn();
        return;
      }
      openMoveShowcase(plan);
    }

    function applyOpponentTurnPlan(plan) {
      if (state.finished) return;
      var oppMove = plan.move;
      var detAdd = plan.detectionAdd || 0;
      state.detection = clamp(state.detection + detAdd, 0, detectionCap);

      var line = '<strong>' + escapeHtml(oppName) + ' ▸ ' + escapeHtml(oppMove.name) + '.</strong> ' +
                 escapeHtml(oppMove.flavor || '') +
                 (detAdd > 0 ? ' <em>+' + detAdd + ' detection.</em>' : '');
      appendLog(line, plan.isIr ? 'crit' : 'opp');

      if (detAdd > 0) {
        floatNumber(oppFloats, '+' + detAdd + ' DET', plan.isIr ? 'crit' : 'damage');
      }
      setPose(oppImg, plan.isIr ? 'excited' : 'thinking', 'opp');
      setPose(playerImg, 'worried', 'player');

      renderDetection();

      if (state.detection >= detectionCap) {
        state.defeatMode = 'detection';
        endBattle(false);
        return;
      }

      state.turn += 1;
      if (state.turn > maxTurns) {
        state.defeatMode = 'timeout';
        endBattle(false);
        return;
      }

      startTurn();
    }

    // Sets up the player-facing UI for the current phase: posture, phase
    // intro line, and the 3-move palette themed to that phase. Called
    // whenever a fresh turn begins (battle start + after Inu's response).
    function startTurn() {
      var phase = phases[state.phaseIdx] || phases[phaseCount - 1];
      renderKillchain();
      renderDetection();
      renderTurnMeter();
      setPosture(phase.posture || null);
      renderMovesForPhase(phase);
      if (movesHint && phase.kicker) {
        movesHint.textContent = phase.kicker + ' · counter his posture for a Critical Insight.';
      }
      if (phase.intro_line && state.phaseProgress === 0) {
        appendLog('<em>' + escapeHtml(phase.kicker || ('Phase ' + phase.phase)) + ':</em> ' +
                  escapeHtml(phase.intro_line), 'phase');
      }
      decorateMoveButtons();
      setMovesEnabled(true);
    }

    /* ------------------------------------------------------------
       End-of-battle
       ------------------------------------------------------------ */

    function endBattle(victory) {
      state.finished = true;
      state.victory = !!victory;
      setMovesEnabled(false);

      var outcome;
      if (victory) {
        var key = state.victoryMode || 'exfil';
        outcome = objectiveOutcomes[key] || objectiveOutcomes.exfil || {
          kicker: 'VICTORY',
          title: 'Mission Complete',
          text: 'You ran the kill chain end-to-end before Cyber Inu pieced it together.'
        };
        setPose(playerImg, 'excited', 'player');
        setPose(oppImg, 'worried', 'opp');
        appendLog('<strong>' + escapeHtml(outcome.kicker) + '.</strong> ' +
                  escapeHtml(outcome.title) + ' — kill chain complete.', 'crit');
      } else {
        var dkey = state.defeatMode || 'detection';
        outcome = defeatModes[dkey] || defeatModes.detection || {
          kicker: 'DEFEAT',
          title: 'Network Held',
          text: oppName + ' holds the line. Try again from the Quiz tab.'
        };
        setPose(playerImg, 'worried', 'player');
        setPose(oppImg, 'excited', 'opp');
        appendLog('<strong>' + escapeHtml(outcome.kicker) + '.</strong> ' +
                  escapeHtml(outcome.title) + ' — your campaign collapses.', 'weak');
      }

      // Build submission payload
      var payload = {
        victory: victory,
        turns: state.turns,
        phases_cleared: state.phasesCleared,
        phases_total: phaseCount,
        detection_final: Math.round(state.detection),
        detection_max: detectionCap,
        turns_used: state.turn,
        max_turns: maxTurns,
        victory_mode: victory ? (state.victoryMode || null) : null,
        defeat_mode: !victory ? (state.defeatMode || null) : null
      };
      if (submissionField) submissionField.value = JSON.stringify(payload);
      if (submitBtn) submitBtn.disabled = false;

      // Configure overlay
      overlayCard.dataset.outcome = victory ? 'victory' : 'defeat';
      overlay.classList.toggle('is-victory', victory);
      overlay.classList.toggle('is-defeat', !victory);
      overlayKicker.textContent = outcome.kicker || (victory ? 'VICTORY' : 'DEFEAT');
      overlayTitle.textContent  = outcome.title  || (victory ? 'Mission Complete' : 'Network Held');
      overlayText.textContent   = outcome.text   || '';
      overlayFinishLabel.textContent = victory ? 'Claim Your Reward' : 'See Score';
      overlay.hidden = false;
      requestAnimationFrame(function () { overlay.classList.add('is-open'); });
    }

    function reset() {
      clearShowcaseTimers();
      pendingShowcasePlan = null;
      showcaseOpen = false;
      if (showcaseRoot) {
        delete showcaseRoot.dataset.battleVerdict;
        delete showcaseRoot.dataset.showcaseStage;
        showcaseRoot.classList.remove('is-open');
        showcaseRoot.hidden = true;
        showcaseRoot.setAttribute('aria-hidden', 'true');
      }
      hideAllShowcaseScenes();

      overlay.classList.remove('is-open');
      overlay.hidden = true;
      logList.innerHTML = '';
      updateLogCount();
      setLogCollapsed(true);
      state = newState();
      renderKillchain();
      renderDetection();
      renderTurnMeter();
      setPose(playerImg, 'happy', 'player');
      setPose(oppImg, 'thinking', 'opp');
      // Optional intro lines from spec.intro (currently empty —
      // the avatar narrator handles all setup context).
      (spec.intro || []).forEach(function (line) {
        appendLog(escapeHtml(line), 'intro');
      });
      var openingPosture = posturesById[(phases[0] && phases[0].posture) || ''] || {};
      appendLog('<strong>' + escapeHtml(oppName) + ' settles into ' +
        escapeHtml(openingPosture.name || 'a defensive') + ' posture.</strong> Your move first.', 'opp');
      startTurn();
      if (submitBtn) submitBtn.disabled = true;
      if (submissionField) submissionField.value = '';
    }

    // ---- Init ----
    if (playerName && playerLabel) playerName.textContent = playerLabel;
    if (detectionMax) detectionMax.textContent = String(detectionCap);
    state = newState();
    reset();

    if (logToggle) {
      logToggle.addEventListener('click', function () {
        var collapsed = logWrap && logWrap.dataset.collapsed === 'true';
        setLogCollapsed(!collapsed);
      });
    }

    if (showcaseSkip) {
      showcaseSkip.addEventListener('click', function () {
        var plan = pendingShowcasePlan;
        if (!plan) return;
        var stage = showcaseRoot && showcaseRoot.dataset.showcaseStage;
        if (stage === 'playing') {
          // Don't bypass the result — jump straight to the effectiveness
          // banner and give the user a brief moment to read it.
          if (showcaseSceneTimer) { clearTimeout(showcaseSceneTimer); showcaseSceneTimer = null; }
          if (showcaseTimer) { clearTimeout(showcaseTimer); showcaseTimer = null; }
          revealShowcaseResult();
          showcaseTimer = setTimeout(function () {
            showcaseTimer = null;
            closeShowcaseThenApply(plan);
          }, prefersReducedMotion() ? 250 : 1400);
          return;
        }
        closeShowcaseThenApply(plan);
      });
    }

    overlayReset.addEventListener('click', function () { reset(); });
    overlayFinish.addEventListener('click', function () {
      if (formEl) {
        if (typeof formEl.requestSubmit === 'function') formEl.requestSubmit();
        else formEl.submit();
      }
    });

    return {
      valid: function () { return state.finished; },
      reset: reset
    };
  }

  /* ------------------------------------------------------------
     Bootstrap
     ------------------------------------------------------------ */
  $(function () {
    var root = document.querySelector('.quiz-challenge');
    if (!root) return;
    var challenge = readJson(root, 'data-challenge', null);
    if (!challenge || challenge.type !== 'battle') return;
    var formEl = document.getElementById('quizChallengeForm');

    var handle = initBattle(root, challenge, formEl);
    if (!handle) return;

    // Keep the bottom nav submit button consistent: only enabled
    // once the battle is over (the overlay has its own button too).
    var submitBtn = document.getElementById('quizSubmitBtn');
    if (submitBtn) submitBtn.disabled = true;
  });

})(window.jQuery);
