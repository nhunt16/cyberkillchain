/* ============================================================
   MASCOT GUIDE · "Neko"

   Classic hand-drawn anime mascot, image-based. A layered
   "puppet" system crossfades between illustrated poses, with
   CSS-driven idle animations (breathing sway, speak bob).

   Illustration assets live in /assets/mascot-*-transparent.png
   (white background removed, PNGs share identical canvas size
   so the character stays pixel-registered across poses).

   Neko is the PRIMARY narrator. The page intentionally omits
   setup / context paragraphs — Neko delivers them instead,
   keyed to section-in-view and carousel phase events from app.js.
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
   Neko owns the storytelling now. Section messages cover the
   context the page no longer prints inline; phase messages set
   the scene; complete messages react to user progress.

   Phase numbering matches the 5-phase carousel (1..5), not the
   original Lockheed Martin 7-phase taxonomy.
   ------------------------------------------------------------ */
const LESSON = {
  /* greet plays the first time the user leaves the hero and arrives
     at the intro. It's merged in front of the intro dialogue so the
     hero can breathe — Neko stays silent (just waving) on the hero. */
  greet: [
    { text: "Nyaa~! I'm Neko, your guide through the Cyber Kill Chain.", expr: 'wave' },
    { text: "I'll handle the setup at every section so the page can stay clean. Tap me any time to hide or show!", expr: 'excited' },
  ],
  section: {
    /* hero intentionally has no dialogue — Neko just waves silently
       so the hero copy stays fully readable */
    intro: [
      { text: "The Cyber Kill Chain was developed by Lockheed Martin as a map of how every cyberattack moves forward.", expr: 'teaching' },
      { text: "Every breach, big or small, has to complete each of these 5 phases to succeed.", expr: 'thinking' },
      { text: "That's the magic: if defenders break any ONE phase, the whole attack collapses.", expr: 'excited' },
    ],
    chain: [
      { text: "Here are the five links of the chain, in order. Each circle is a phase the attacker must complete.", expr: 'teaching' },
      { text: "Click any circle to preview what happens — and how defenders push back — at that phase.", expr: 'happy' },
    ],
    phases: [
      { text: "Now for the fun part: each phase has a live mini-simulation you can drive yourself.", expr: 'excited' },
      { text: "Use the tabs above, or the Next button below, to move through all five phases in order.", expr: 'teaching' },
    ],
    casestudy: [
      { text: "Real world time! This is MGM Resorts, September 2023. Scattered Spider used every phase you just learned, in exact order.", expr: 'alert' },
      { text: "A single 10-minute phone call to the IT help desk caused over $100M in losses. Social engineering is scary powerful!", expr: 'worried' },
    ],
    quiz: [
      { text: "Final boss! Time to prove you really get it. Reorder the phases, classify attack events, and defend the network.", expr: 'excited' },
      { text: "A breach just happened — can you reconstruct the attack? I believe in you, nyaa~!", expr: 'happy' },
    ],
  },
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

   With transparent PNGs there's no card/frame — Neko floats
   directly on the page, anchored by a soft drop shadow and a
   tiny elliptical ground shadow for weight.
   ------------------------------------------------------------ */
function CatGirlMascot({ expression = 'happy', size = 140, speaking = false }) {
  const activePose = EXPRESSION_TO_POSE[expression] || 'happy';
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      className={`mascot-portrait${speaking ? ' is-speaking' : ''}${mounted ? ' is-mounted' : ''}`}
      style={{ width: size }}
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
function useTypewriter(text, speed = 18) {
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
   MASCOT GUIDE · the interactive companion
   Tracks section-in-view, listens for phase/complete events from
   app.js, and queues the matching LESSON messages.
   ------------------------------------------------------------ */
function MascotGuide() {
  /* Start closed — Neko waves silently on the hero so the intro copy
     ("Understand the five phases…") stays fully readable. The bubble
     auto-opens the first time the user leaves the hero. */
  const [queue, setQueue] = useState([{ text: '', expr: 'wave' }]);
  const [qIndex, setQIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [currentSection, setCurrentSection] = useState('hero');
  const [greeted, setGreeted] = useState(false);
  const seenKeys = useRef(new Set());

  const current = queue[qIndex] || { text: '', expr: 'happy' };
  const [typed, typedDone, skip] = useTypewriter(current.text, 16);

  const queueMessages = useCallback((messages, key, { prependGreet = false } = {}) => {
    if (!messages || !messages.length) return;
    if (key && seenKeys.current.has(key)) return;
    if (key) seenKeys.current.add(key);
    const next = prependGreet ? [...LESSON.greet, ...messages] : messages;
    setQueue(next);
    setQIndex(0);
    setOpen(true);
  }, []);

  useEffect(() => {
    const sections = ['hero', 'intro', 'chain', 'phases', 'casestudy', 'quiz']
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    if (!sections.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        let best = null;
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          if (!best || e.intersectionRatio > best.intersectionRatio) best = e;
        }
        if (best) {
          const id = best.target.id;
          if (id !== currentSection) {
            setCurrentSection(id);
            if (id === 'hero') return; // stay silent on the hero
            const msgs = LESSON.section[id];
            if (msgs) {
              // on the first real section, fold the greeting in front
              const prepend = !greeted;
              if (prepend) setGreeted(true);
              queueMessages(msgs, `sec:${id}`, { prependGreet: prepend });
            }
          }
        }
      },
      { threshold: [0.25, 0.5, 0.75] }
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [currentSection, greeted, queueMessages]);

  useEffect(() => {
    const onPhase = (e) => {
      const { sceneName } = e.detail || {};
      const msgs = LESSON.phase[sceneName];
      if (msgs) queueMessages(msgs, `phase:${sceneName}`);
    };
    const onComplete = (e) => {
      const { sceneName } = e.detail || {};
      const msg = LESSON.complete[sceneName];
      if (msg) queueMessages([msg], `done:${sceneName}`);
    };
    document.addEventListener('mascot:phase', onPhase);
    document.addEventListener('mascot:complete', onComplete);
    return () => {
      document.removeEventListener('mascot:phase', onPhase);
      document.removeEventListener('mascot:complete', onComplete);
    };
  }, [queueMessages]);

  const next = () => {
    if (!typedDone) { skip(); return; }
    if (qIndex < queue.length - 1) setQIndex(qIndex + 1);
    else setOpen(false);
  };
  const toggle = () => {
    if (!open) {
      // If the user taps Neko before scrolling, kick off the greeting
      // so she always has something to say on first interaction.
      if (!greeted) {
        setGreeted(true);
        setQueue([...LESSON.greet]);
        setQIndex(0);
        seenKeys.current.add('__greet');
      }
      setOpen(true);
      return;
    }
    setOpen(false);
  };

  const showHint = !open && !greeted;

  return (
    <div className={`mascot-guide${open ? ' is-open' : ' is-closed'}`}>
      <button
        className="mascot-sprite"
        onClick={toggle}
        aria-label={open ? 'Hide mascot' : 'Show mascot'}
      >
        <CatGirlMascot expression={current.expr} size={150} speaking={open && !typedDone} />
        {showHint && (
          <span className="mascot-hint" aria-hidden="true">
            <span className="mascot-hint-text">tap me~</span>
          </span>
        )}
      </button>
      {open && (
        <div className="mascot-bubble" role="status" aria-live="polite">
          <div className="mascot-bubble-head">
            <span className="mascot-bubble-name">Neko</span>
            <span className="mascot-bubble-sub">kill-chain guide</span>
            <button
              className="mascot-bubble-close"
              onClick={() => setOpen(false)}
              aria-label="Hide mascot"
            >×</button>
          </div>
          <p className="mascot-bubble-text">
            {typed}
            {!typedDone && <span className="mascot-caret" />}
          </p>
          <div className="mascot-bubble-actions">
            <span className="mascot-bubble-progress">
              {qIndex + 1} / {queue.length}
            </span>
            <button className="mascot-bubble-next" onClick={next}>
              {typedDone
                ? (qIndex < queue.length - 1 ? 'Next →' : 'Got it')
                : 'Skip'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
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
            <CatGirlMascot expression={e} size={200} />
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
