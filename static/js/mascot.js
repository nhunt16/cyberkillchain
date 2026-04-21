/* ============================================================
   MASCOT · Neko (vanilla, single-page-at-a-time)

   Each page drops a <div class="mascot-host"
                        data-mascot-script='[{text, expr}, ...]'
                        data-mascot-topic="Topic label"></div>
   This module finds every host on the page, renders the narrator
   panel, and plays the scripted lines through a typewriter.
   ============================================================ */

(function () {
  'use strict';

  var POSES = {
    happy:    'static/assets/mascot-base-happy-transparent.png',
    excited:  'static/assets/mascot-excited-transparent.png',
    thinking: 'static/assets/mascot-thinking-transparent.png',
    teaching: 'static/assets/mascot-teaching-transparent.png',
    worried:  'static/assets/mascot-worried-transparent.png'
  };

  var EXPR_TO_POSE = {
    happy: 'happy', wave: 'happy',
    excited: 'excited',
    thinking: 'thinking', sleepy: 'thinking',
    teaching: 'teaching',
    worried: 'worried', alert: 'worried'
  };

  // Pre-cache pose images so cross-fades don't flash.
  Object.values(POSES).forEach(function (src) {
    var img = new Image();
    img.src = resolveAsset(src);
  });

  // Flask serves PNGs from /static/assets/. We embed them via a URL
  // that the backend rewrites; fall back to relative if not found.
  function resolveAsset(src) {
    if (window.__MASCOT_ASSET_BASE__) {
      var name = src.split('/').pop();
      return window.__MASCOT_ASSET_BASE__.replace(/\/?$/, '/') + name;
    }
    return '/' + src;
  }

  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') el.className = attrs[k];
      else if (k === 'text') el.textContent = attrs[k];
      else if (k === 'html') el.innerHTML = attrs[k];
      else if (k.startsWith('on') && typeof attrs[k] === 'function') {
        el.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
      } else if (attrs[k] !== undefined && attrs[k] !== null && attrs[k] !== false) {
        el.setAttribute(k, attrs[k]);
      }
    });
    (children || []).forEach(function (c) {
      if (c == null) return;
      if (typeof c === 'string') el.appendChild(document.createTextNode(c));
      else el.appendChild(c);
    });
    return el;
  }

  function buildPortrait(poseName) {
    var portrait = h('div', { class: 'mascot-portrait is-mounted', role: 'img',
                              'aria-label': 'Neko, ' + poseName });
    portrait.appendChild(h('div', { class: 'mascot-ground', 'aria-hidden': 'true' }));

    var poseEls = {};
    Object.keys(POSES).forEach(function (name) {
      var img = h('img', {
        src: resolveAsset(POSES[name]),
        alt: '',
        class: 'neko-pose neko-pose--' + name + (name === poseName ? ' is-active' : ''),
        draggable: false,
        'aria-hidden': 'true'
      });
      portrait.appendChild(img);
      poseEls[name] = img;
    });
    return { el: portrait, poseEls: poseEls };
  }

  function setPose(portrait, poseName) {
    var el = portrait.el;
    el.setAttribute('aria-label', 'Neko, ' + poseName);
    Object.keys(portrait.poseEls).forEach(function (name) {
      portrait.poseEls[name].classList.toggle('is-active', name === poseName);
    });
  }

  function setSpeaking(portrait, speaking) {
    portrait.el.classList.toggle('is-speaking', !!speaking);
  }

  function mountMascot(host) {
    var raw = host.getAttribute('data-mascot-script') || '[]';
    var topic = host.getAttribute('data-mascot-topic') || '';
    var script = [];
    try {
      script = JSON.parse(raw);
    } catch (e) {
      console.error('Mascot script JSON parse failed:', e);
      return;
    }
    if (!Array.isArray(script) || script.length === 0) return;

    var state = {
      idx: 0,
      typedText: '',
      typedTimer: null,
      typing: false,
      dismissed: false
    };

    host.innerHTML = '';

    var current = function () { return script[state.idx] || { text: '', expr: 'happy' }; };
    var currentPose = function () { return EXPR_TO_POSE[current().expr] || 'happy'; };

    var portrait = buildPortrait(currentPose());

    var avatarWrap = h('div', { class: 'mascot-stage-avatar' }, [portrait.el]);
    var bodyText = h('p', { class: 'mascot-stage-text' });
    var stepsEl = h('div', { class: 'mascot-stage-steps', 'aria-hidden': 'true' });
    var progressEl = h('span', { class: 'mascot-stage-progress', 'aria-live': 'polite' });
    var nextBtn = h('button', { class: 'mascot-stage-next', type: 'button' });

    var closeBtn = h('button', {
      class: 'mascot-stage-close',
      type: 'button',
      'aria-label': 'Dismiss narration',
      title: 'Dismiss'
    }, ['×']);

    var head = h('div', { class: 'mascot-stage-head' }, [
      h('span', { class: 'mascot-stage-name', text: 'Neko' }),
      h('span', { class: 'mascot-stage-topic', text: topic }),
      closeBtn
    ]);

    var actions = h('div', { class: 'mascot-stage-actions' }, [
      stepsEl,
      progressEl,
      nextBtn
    ]);

    var card = h('div', { class: 'mascot-stage-card' }, [head, bodyText, actions]);

    var stage = h('div', { class: 'mascot-stage', 'data-active-section': topic }, [
      avatarWrap, card
    ]);

    host.appendChild(stage);

    function renderSteps() {
      stepsEl.innerHTML = '';
      script.forEach(function (_, i) {
        var cls = 'mascot-stage-step';
        if (i === state.idx) cls += ' is-current';
        else if (i < state.idx) cls += ' is-past';
        stepsEl.appendChild(h('span', { class: cls }));
      });
      progressEl.textContent = (state.idx + 1) + ' / ' + script.length;
    }

    function typeLine(text, onDone) {
      if (state.typedTimer) { clearInterval(state.typedTimer); state.typedTimer = null; }
      state.typing = true;
      state.typedText = '';
      bodyText.innerHTML = '<span class="mascot-caret"></span>';
      setSpeaking(portrait, true);
      var i = 0;
      state.typedTimer = setInterval(function () {
        i += 1;
        state.typedText = text.slice(0, i);
        bodyText.innerHTML = escapeHtml(state.typedText) +
          (i < text.length ? '<span class="mascot-caret"></span>' : '');
        if (i >= text.length) {
          clearInterval(state.typedTimer);
          state.typedTimer = null;
          state.typing = false;
          setSpeaking(portrait, false);
          updateNextLabel();
          if (onDone) onDone();
        }
      }, 16);
    }

    function escapeHtml(s) {
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    function updateNextLabel() {
      var atEnd = state.idx >= script.length - 1;
      if (state.typing) nextBtn.textContent = 'Skip';
      else if (atEnd) nextBtn.textContent = 'Got it';
      else nextBtn.textContent = 'Next →';
    }

    function showLine() {
      var line = current();
      setPose(portrait, EXPR_TO_POSE[line.expr] || 'happy');
      renderSteps();
      typeLine(line.text || '');
      updateNextLabel();
    }

    function advance() {
      if (state.typing) {
        // skip typewriter
        if (state.typedTimer) { clearInterval(state.typedTimer); state.typedTimer = null; }
        state.typing = false;
        setSpeaking(portrait, false);
        var full = current().text || '';
        bodyText.textContent = full;
        updateNextLabel();
        return;
      }
      if (state.idx < script.length - 1) {
        state.idx += 1;
        showLine();
      } else {
        collapse();
      }
    }

    function collapse() {
      state.dismissed = true;
      host.innerHTML = '';
      var peekAvatar = buildPortrait(currentPose());
      var pill = h('button', {
        class: 'mascot-stage-reopen',
        type: 'button',
        'aria-label': "Reopen Neko's narration"
      }, [
        h('span', { class: 'mascot-stage-reopen-avatar' }, [peekAvatar.el]),
        h('span', { class: 'mascot-stage-reopen-text' }, [
          h('span', { class: 'mascot-stage-reopen-name', text: 'Neko' }),
          h('span', { class: 'mascot-stage-reopen-cta', text: 'Replay narration →' })
        ])
      ]);
      pill.addEventListener('click', function () {
        state.dismissed = false;
        state.idx = 0;
        host.innerHTML = '';
        mountMascot(host); // rebuild fresh
      });
      var wrap = h('div', { class: 'mascot-stage mascot-stage--collapsed' }, [pill]);
      host.appendChild(wrap);
    }

    nextBtn.addEventListener('click', advance);
    closeBtn.addEventListener('click', collapse);

    // Kick off the first line
    showLine();
  }

  function init() {
    var hosts = document.querySelectorAll('.mascot-host[data-mascot-script]');
    hosts.forEach(mountMascot);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
