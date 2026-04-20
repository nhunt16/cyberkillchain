/* ============================================================
   MASCOT GUIDE · "Neko"

   Neko is the PRIMARY narrator of the lesson. Instead of sitting
   tucked into a corner, she appears inline at the top of each
   major section as a large "host panel": avatar on the left, a
   wide speech bubble on the right that introduces the topic.

   Each major section (intro, chain, phases, casestudy, quiz)
   contains a <div class="mascot-host" data-section="..."> slot.
   This component uses a React portal to render Neko into the
   slot that matches the section currently in view.

   The hero section intentionally has no host — Neko stays off
   the page entirely there so the hero copy can breathe. Once the
   user scrolls into a real section, Neko appears and takes over
   the introduction.

   Illustration assets live in /assets/mascot-*-transparent.png
   (white background removed, PNGs share identical canvas size so
   the character stays pixel-registered across poses).
   ============================================================ */

const { useState, useEffect, useRef, useMemo, useCallback } = React;

/* ------------------------------------------------------------
   POSE IMAGES · transparent PNGs, identical canvas size so they
   cross-fade without a visible shift.
   ------------------------------------------------------------ */
const POSE_IMAGES = {
  happy:    'assets/mascot-base-happy-transparent.png',
  excited:  'assets/mascot-excited-transparent.png',
  thinking: 'assets/mascot-thinking-transparent.png',
  teaching: 'assets/mascot-teaching-transparent.png',
  worried:  'assets/mascot-worried-transparent.png',
};

const EXPRESSION_TO_POSE = {
  happy:    'happy',
  wave:     'happy',
  excited:  'excited',
  thinking: 'thinking',
  sleepy:   'thinking',
  teaching: 'teaching',
  worried:  'worried',
  alert:    'worried',
};

/* ------------------------------------------------------------
   LESSON SCRIPT
   Neko owns the storytelling. Section messages cover the context
   the page no longer prints inline; phase messages set the scene
   when the user changes the carousel; complete messages react to
   user progress.
   ------------------------------------------------------------ */
const LESSON = {
  section: {
    intro: [
      { text: "Hi, I'm Neko! I'll be your guide through the Cyber Kill Chain — nyaa~!", expr: 'wave' },
      { text: "The Cyber Kill Chain was developed by Lockheed Martin as a map of how every cyberattack moves forward.", expr: 'teaching' },
      { text: "Every breach, big or small, has to complete each of these 5 phases to succeed.", expr: 'thinking' },
      { text: "That's the magic: if defenders break any ONE phase, the whole attack collapses.", expr: 'excited' },
    ],
    chain: [
      { text: "Here are the five links of the chain, in order. Each circle is a phase the attacker must complete.", expr: 'teaching' },
      { text: "Click any circle below to preview what happens — and how defenders push back — at that phase.", expr: 'happy' },
    ],
    phases: [
      { text: "Now for the fun part: each phase has a live mini-simulation you can drive yourself.", expr: 'excited' },
      { text: "Use the tabs or the Next button below to move through all five phases in order. I'll narrate each one!", expr: 'teaching' },
    ],
    casestudy: [
      { text: "Real-world time! This is MGM Resorts, September 2023. Scattered Spider used every phase you just learned.", expr: 'alert' },
      { text: "A single 10-minute phone call to the IT help desk caused over $100M in losses. Social engineering is scary powerful!", expr: 'worried' },
    ],
    quiz: [
      { text: "Final boss! Time to prove you really get it. Reorder the phases, classify attack events, and defend the network.", expr: 'excited' },
      { text: "A breach just happened — can you reconstruct the attack? I believe in you, nyaa~!", expr: 'happy' },
    ],
  },
  /* Phase messages fire inside the "phases" section when the user
     changes the carousel. They replace the current script while
     the user is on that section. */
  phase: {
    recon: [
      { text: "Phase 1 · Reconnaissance. The attacker has picked ACME Corp as their target.", expr: 'thinking' },
      { text: "This is PASSIVE recon — just Google, LinkedIn, job posts, public leaks. The victim never notices.", expr: 'teaching' },
      { text: "Hit Start Scan to watch them harvest employee emails for the next phase!", expr: 'excited' },
    ],
    armdeliver: [
      { text: "Phase 2 · Arm & Deliver. With the target list in hand, they build a weapon and pick a delivery ride.", expr: 'teaching' },
      { text: "The #1 ride? Email. Walk through the three steps to craft a malicious doc and phish poor Mike.", expr: 'alert' },
    ],
    exploit: [
      { text: "Phase 3 · Exploitation. Mike opens what LOOKS like an invoice. He sees a warning. Just one careless click…", expr: 'alert' },
      { text: "Click the glowing Enable Content button yourself to see exactly what fires behind the scenes.", expr: 'teaching' },
    ],
    control: [
      { text: "Phase 4 · Establish Control. Code is running on Mike's machine. The attacker plants backdoors and calls home.", expr: 'thinking' },
      { text: "Run each step in order to watch persistence get installed, then see the encrypted C2 tunnel come alive.", expr: 'teaching' },
    ],
    exfil: [
      { text: "Phase 5 · Exfiltration. Mission objective time — steal the crown jewels. This is the loud part.", expr: 'worried' },
      { text: "Click files one at a time, or smash-and-grab everything at once. Either way, the damage is done.", expr: 'alert' },
    ],
  },
  complete: {
    recon:      { text: "Recon complete, nyaa~! Target profiled. One phase down, four to go!", expr: 'excited' },
    armdeliver: { text: "Payload weaponized and delivered! The phishing email is in Mike's inbox…", expr: 'excited' },
    exploit:    { text: "Exploit landed. The door is open. Now we see what the attacker does with that foothold…", expr: 'alert' },
    control:    { text: "Beacon is live. The attacker owns Mike's machine. Scary — but you're almost at the finish!", expr: 'worried' },
    exfil:      { text: "All five phases complete! You officially understand how a cyberattack unfolds. Treat yourself!", expr: 'excited' },
  },
};

const SECTION_TITLES = {
  intro:     'The Framework',
  chain:     'The Five Links',
  phases:    'Interactive Walkthrough',
  casestudy: 'Case Study · MGM 2023',
  quiz:      'Your Challenge',
};

/* ------------------------------------------------------------
   PRELOAD · ensure every pose is cached before the first
   crossfade, so there's no flash on transition.
   ------------------------------------------------------------ */
(function preloadPoses() {
  if (typeof window === 'undefined') return;
  for (const src of Object.values(POSE_IMAGES)) {
    const img = new Image();
    img.src = src;
  }
})();

/* ------------------------------------------------------------
   CAT GIRL MASCOT (image-based puppet)

   All pose images are rendered stacked and absolutely positioned.
   The currently-active pose fades in while others fade out.
   Uses the intrinsic aspect ratio of the source PNGs (1376/768).
   ------------------------------------------------------------ */
function CatGirlMascot({ expression = 'happy', speaking = false }) {
  const activePose = EXPRESSION_TO_POSE[expression] || 'happy';
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      className={`mascot-portrait${speaking ? ' is-speaking' : ''}${mounted ? ' is-mounted' : ''}`}
      role="img"
      aria-label={`Neko, ${activePose}`}
    >
      <div className="mascot-ground" aria-hidden="true" />
      {Object.entries(POSE_IMAGES).map(([name, src]) => (
        <img
          key={name}
          src={src}
          alt=""
          className={`neko-pose neko-pose--${name}${activePose === name ? ' is-active' : ''}`}
          aria-hidden="true"
          draggable={false}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------
   CHARACTER-BY-CHARACTER TYPEWRITER
   ------------------------------------------------------------ */
function useTypewriter(text, speed = 16) {
  const [out, setOut] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    setOut('');
    setDone(false);
    if (!text) return;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setOut(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  const skip = useCallback(() => { setOut(text); setDone(true); }, [text]);
  return [out, done, skip];
}

/* ------------------------------------------------------------
   ACTIVE SECTION HOOK
   Tracks which section is currently dominating the viewport and
   returns its id. The hero and pre-hero regions return null so
   Neko stays hidden until the user enters real content.
   ------------------------------------------------------------ */
const SECTION_IDS = ['intro', 'chain', 'phases', 'casestudy', 'quiz'];

function useActiveSection() {
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    const sections = SECTION_IDS
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    if (!sections.length) return;

    const visibility = new Map();

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          visibility.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0);
        }
        let bestId = null;
        let bestRatio = 0;
        for (const [id, ratio] of visibility.entries()) {
          if (ratio > bestRatio) { bestRatio = ratio; bestId = id; }
        }
        if (bestRatio > 0.08) setActiveId(bestId);
        else setActiveId(null);
      },
      { threshold: [0, 0.08, 0.2, 0.4, 0.6, 0.8, 1] }
    );

    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  return activeId;
}

/* ------------------------------------------------------------
   MASCOT GUIDE · the interactive narrator

   Renders a large "host panel" (avatar + speech card) into the
   mascot-host slot belonging to the currently active section,
   using React portals. Listens for carousel phase and scene
   completion events so that within the phases section, Neko
   narrates each individual phase as the user advances.
   ------------------------------------------------------------ */
function MascotGuide() {
  const activeSection = useActiveSection();
  const [queue, setQueue] = useState([]);
  const [qIndex, setQIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  /* The "source" of the current script: either a section id or a
     phase scene name. We use it to avoid replaying the same script
     over and over as visibility thresholds flicker. */
  const scriptSourceRef = useRef(null);

  const current = queue[qIndex] || { text: '', expr: 'happy' };
  const [typed, typedDone, skip] = useTypewriter(current.text, 16);

  const loadScript = useCallback((messages, sourceKey) => {
    if (!messages || !messages.length) return;
    if (scriptSourceRef.current === sourceKey) return;
    scriptSourceRef.current = sourceKey;
    setQueue(messages);
    setQIndex(0);
    setDismissed(false);
  }, []);

  /* When the active section changes, load that section's script.
     Exception: while the user is inside the "phases" section, the
     carousel phase events drive the script instead. */
  useEffect(() => {
    if (!activeSection) return;
    if (activeSection === 'phases' && scriptSourceRef.current?.startsWith('phase:')) {
      // Keep phase-level narration even as the section gains/loses
      // visibility — only override if we haven't loaded any phase yet.
      return;
    }
    const msgs = LESSON.section[activeSection];
    if (msgs) loadScript(msgs, `section:${activeSection}`);
  }, [activeSection, loadScript]);

  /* Listen for the carousel's phase events and override the script
     so Neko narrates the currently-displayed phase. */
  useEffect(() => {
    const onPhase = (e) => {
      const { sceneName } = e.detail || {};
      const msgs = LESSON.phase[sceneName];
      if (msgs) loadScript(msgs, `phase:${sceneName}`);
    };
    const onComplete = (e) => {
      const { sceneName } = e.detail || {};
      const msg = LESSON.complete[sceneName];
      if (!msg) return;
      // A completion is a single flash — append it to the current
      // queue without resetting the source key, so we don't loop.
      setQueue((q) => {
        // Avoid duplicate completion lines
        if (q.some((m) => m.text === msg.text)) return q;
        return [...q, msg];
      });
      setQIndex((i) => i); // no-op, but keeps state consistent
      setDismissed(false);
    };
    document.addEventListener('mascot:phase', onPhase);
    document.addEventListener('mascot:complete', onComplete);
    return () => {
      document.removeEventListener('mascot:phase', onPhase);
      document.removeEventListener('mascot:complete', onComplete);
    };
  }, [loadScript]);

  const next = () => {
    if (!typedDone) { skip(); return; }
    if (qIndex < queue.length - 1) setQIndex(qIndex + 1);
    else setDismissed(true);
  };

  const replay = () => {
    setQIndex(0);
    setDismissed(false);
  };

  /* Find the host slot for the active section. If none (hero or
     between sections), render nothing. */
  const host = useMemo(() => {
    if (!activeSection) return null;
    return document.querySelector(`.mascot-host[data-section="${activeSection}"]`);
  }, [activeSection]);

  if (!host) return null;

  const sectionTitle = SECTION_TITLES[activeSection] || '';
  const stepLabel = `${qIndex + 1} / ${queue.length}`;
  const atEnd = qIndex >= queue.length - 1 && typedDone;

  /* Two render paths:
     - Expanded panel (default): avatar + full speech card.
     - Collapsed strip (after user dismisses): slim row with
       avatar peek and a "Neko has more to say" reopen button.
     Both render into the same host slot so the page layout is
     stable whichever state we're in. */
  const panel = dismissed ? (
    <div className="mascot-stage mascot-stage--collapsed" data-active-section={activeSection}>
      <button className="mascot-stage-reopen" onClick={replay} aria-label="Reopen Neko's narration">
        <span className="mascot-stage-reopen-avatar">
          <CatGirlMascot expression="happy" speaking={false} />
        </span>
        <span className="mascot-stage-reopen-text">
          <span className="mascot-stage-reopen-name">Neko</span>
          <span className="mascot-stage-reopen-cta">Replay narration →</span>
        </span>
      </button>
    </div>
  ) : (
    <div className="mascot-stage" data-active-section={activeSection}>
      <div className="mascot-stage-avatar">
        <CatGirlMascot expression={current.expr} speaking={!typedDone} />
      </div>
      <div className="mascot-stage-card">
        <div className="mascot-stage-head">
          <span className="mascot-stage-name">Neko</span>
          <span className="mascot-stage-topic">{sectionTitle}</span>
          <button
            className="mascot-stage-close"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss narration"
            title="Dismiss"
          >×</button>
        </div>
        <p className="mascot-stage-text">
          {typed}
          {!typedDone && <span className="mascot-caret" />}
        </p>
        <div className="mascot-stage-actions">
          <div className="mascot-stage-steps" aria-hidden="true">
            {queue.map((_, i) => (
              <span
                key={i}
                className={`mascot-stage-step${i === qIndex ? ' is-current' : ''}${i < qIndex ? ' is-past' : ''}`}
              />
            ))}
          </div>
          <span className="mascot-stage-progress" aria-live="polite">{stepLabel}</span>
          <button className="mascot-stage-next" onClick={next}>
            {!typedDone ? 'Skip' : atEnd ? 'Got it' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(panel, host);
}

/* ------------------------------------------------------------
   DEBUG · pose preview (trigger with ?neko=debug)
   ------------------------------------------------------------ */
function NekoDebug() {
  const exprs = Object.keys(EXPRESSION_TO_POSE);
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'radial-gradient(circle at 30% 30%, #1a1e2e, #05060b)',
      padding: 24, overflow: 'auto',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
      fontFamily: '-apple-system, system-ui, sans-serif', color: '#fff'
    }}>
      <h1 style={{ margin: 0, fontWeight: 300, letterSpacing: '0.05em', opacity: 0.85, fontSize: 20 }}>
        Neko · pose sheet (transparent)
      </h1>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 16,
        maxWidth: 1100,
      }}>
        {exprs.map((e) => (
          <div key={e} style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 14, padding: 14,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          }}>
            <div style={{
              fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em',
              opacity: 0.7, fontWeight: 600,
            }}>
              {e}
            </div>
            <div style={{ width: 200 }}>
              <CatGirlMascot expression={e} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------
   BOOT
   ------------------------------------------------------------ */
const mountNode = document.getElementById('mascot-root');
if (mountNode) {
  const root = ReactDOM.createRoot(mountNode);
  const isDebug = /[?&]neko=debug/.test(window.location.search);
  root.render(isDebug ? <NekoDebug /> : <MascotGuide />);
}
