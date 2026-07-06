import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = "landing" | "letter" | "reveal" | "final" | "celebration";

interface Group {
  id: number;
  lines: string[];
  suspense: boolean;
  last: boolean;
  auto?: boolean;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const GROUPS: Group[] = [
  {
    id: 0,
    lines: ["Hi.", "I've been wanting to tell someone something."],
    suspense: false, last: false,
  },
  {
    id: 1,
    lines: [
      "There's someone who has been making my days brighter.",
      "She's kind.",
      "She's incredibly talented. I love how she makes music.",
    ],
    suspense: false, last: false,
  },
  {
    id: 2,
    lines: [
      "She's funny.",
      "Sometimes our sense of humor doesn't quite match, but somehow we still end up laughing together.",
      "She's beautiful.",
      "I love how creative she is with her outfits.",
      "I love how she can take the simplest things and somehow make them work.",
      "I love that she's unapologetically herself.",
    ],
    suspense: false, last: false,
  },
  {
    id: 3,
    lines: [
      "She probably doesn't realize how special she really is.",
      "She keeps comparing herself to other people.",
      "She thinks no one could ever love her for who she is.",
      "I wish she could see herself the way I see her.",
    ],
    suspense: false, last: false,
  },
  {
    id: 4,
    lines: [
      "I always look forward to talking to her.",
      "My day never feels complete if I don't get to talk to her.",
      "I hope this makes her smile.",
      "I know she's been crying a lot lately.",
      "It hurts knowing she's carrying all of that by herself.",
      "I don't know why, but all I want is to make her smile again.",
      "I want to be someone who gives her a reason to stop crying.",
    ],
    suspense: false, last: false,
  },
  {
    id: 5,
    lines: [
      "I don't know when I started falling for her.",
      "It just happened.",
      "Somehow, she made me feel alive again.",
      "She gave me hope when I thought I had already lost it.",
    ],
    suspense: true, last: false,
  },
  {
    id: 6,
    lines: [
      "She still doesn't know...",
      "...that every word here has always been about her.",
    ],
    suspense: true, last: true, auto: true,
  },
];

const BG_HEARTS = Array.from({ length: 15 }, (_, i) => ({
  id: i,
  left: `${3 + (i * 6.7) % 94}%`,
  size: 10 + (i * 5) % 14,
  dur: 6 + (i * 1.6) % 5,
  delay: (i * 0.63) % 5,
  opacity: 0.15 + (i * 0.035) % 0.28,
  drift: -30 + (i * 9) % 60,
  color: i % 3 === 0 ? "#dccbff" : i % 3 === 1 ? "#ffb3d9" : "#ff9ec8",
}));

const SPARKLES = Array.from({ length: 10 }, (_, i) => ({
  id: i,
  left: `${8 + (i * 9.1) % 84}%`,
  top: `${8 + (i * 11.3) % 72}%`,
  size: 7 + (i * 3) % 8,
  dur: 2.6 + (i * 0.45) % 2,
  delay: (i * 0.48) % 3,
  color: i % 2 === 0 ? "#ffd6e8" : "#dccbff",
}));

const RAIN = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  left: `${(i * 3.4) % 100}%`,
  delay: (i * 0.11) % 3,
  dur: 2.6 + (i * 0.22) % 2.2,
  size: 12 + (i * 4) % 22,
  color: ["#ff9ec8", "#dccbff", "#ffd6e8", "#ffb3d9"][i % 4],
}));

const BURST_ANGLES = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2;
  return {
    id: i,
    tx: Math.cos(a) * (68 + (i % 3) * 18),
    ty: Math.sin(a) * (68 + (i % 3) * 18) - 24,
    color: i % 2 === 0 ? "#ff9ec8" : "#dccbff",
    size: 10 + (i % 3) * 5,
  };
});

// ─── Utils ────────────────────────────────────────────────────────────────────

function lerpHex(h1: string, h2: string, t: number): string {
  const p = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const [r1, g1, b1] = p(h1);
  const [r2, g2, b2] = p(h2);
  const c = (a: number, b: number) =>
    Math.round(a + (b - a) * Math.min(1, Math.max(0, t))).toString(16).padStart(2, "0");
  return `#${c(r1, r2)}${c(g1, g2)}${c(b1, b2)}`;
}

const MUSIC_URL = "/music.mp3";

function fadeAudio(audio: HTMLAudioElement, target: number, ms = 1400) {
  const steps = 30;
  const stepMs = ms / steps;
  const start = audio.volume;
  const diff = target - start;
  let i = 0;
  const id = setInterval(() => {
    i++;
    audio.volume = Math.min(1, Math.max(0, start + (diff * i) / steps));
    if (i >= steps) clearInterval(id);
  }, stepMs);
  return id;
}

function makeHeartPts(n: number, s: number) {
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    return {
      x: 16 * Math.pow(Math.sin(t), 3) * s,
      y: -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * s,
    };
  });
}

// ─── Hook: Typewriter ─────────────────────────────────────────────────────────

function useTypewriter(text: string, speed = 42, enabled = true) {
  const [idx, setIdx] = useState(0);
  useEffect(() => { setIdx(0); }, [text]);
  useEffect(() => {
    if (!enabled || idx >= text.length) return;
    const id = setTimeout(() => setIdx((i) => i + 1), speed);
    return () => clearTimeout(id);
  }, [enabled, idx, text, speed]);
  return {
    display: text.slice(0, idx),
    done: enabled && text.length > 0 && idx >= text.length,
  };
}

// ─── Component: Background ────────────────────────────────────────────────────

function Background({ warmth }: { warmth: number }) {
  const c1 = lerpHex("#ffd6e8", "#ff9ec8", warmth);
  const c2 = lerpHex("#dccbff", "#c090ff", warmth);
  const c3 = lerpHex("#fff0f5", "#ffd6e8", warmth);
  const blob1 = lerpHex("#ffd6e8", "#ff80b9", warmth);
  const blob2 = lerpHex("#dccbff", "#b080ff", warmth);
  const blob3 = lerpHex("#ffc4e1", "#ff9ec8", warmth);

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ zIndex: 0 }}>
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${c1} 0%, ${c2} 55%, ${c3} 100%)`,
          transition: "background 2s ease",
        }}
      />

      {/* Animated blobs */}
      <motion.div
        className="absolute rounded-full blur-3xl"
        style={{
          width: "min(60vw, 420px)",
          height: "min(60vw, 420px)",
          background: `radial-gradient(circle, ${blob1}cc, transparent 70%)`,
          left: "-8%",
          top: "-8%",
          opacity: 0.75,
        }}
        animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
        transition={{ duration: 9, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
      />
      <motion.div
        className="absolute rounded-full blur-3xl"
        style={{
          width: "min(55vw, 380px)",
          height: "min(55vw, 380px)",
          background: `radial-gradient(circle, ${blob2}cc, transparent 70%)`,
          right: "-5%",
          bottom: "-5%",
          opacity: 0.75,
        }}
        animate={{ x: [0, -25, 0], y: [0, -30, 0] }}
        transition={{ duration: 11, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
      />
      <motion.div
        className="absolute rounded-full blur-3xl"
        style={{
          width: "min(45vw, 300px)",
          height: "min(45vw, 300px)",
          background: `radial-gradient(circle, ${blob3}cc, transparent 70%)`,
          left: "25%",
          top: "32%",
          opacity: 0.5,
        }}
        animate={{ x: [0, 18, -14, 0], y: [0, -22, 10, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Floating hearts */}
      {BG_HEARTS.map((h) => (
        <motion.div
          key={h.id}
          className="absolute pointer-events-none select-none"
          style={{ left: h.left, bottom: "-4%", fontSize: h.size, color: h.color, opacity: h.opacity }}
          animate={{ y: [0, "-120vh"], x: [0, h.drift] }}
          transition={{ duration: h.dur, delay: h.delay, repeat: Infinity, ease: "easeOut" }}
        >
          ♥
        </motion.div>
      ))}

      {/* Sparkles */}
      {SPARKLES.map((s) => (
        <motion.div
          key={s.id}
          className="absolute pointer-events-none"
          style={{ left: s.left, top: s.top, fontSize: s.size, color: s.color }}
          animate={{ opacity: [0, 1, 0], scale: [0.3, 1.2, 0.3], rotate: [0, 180, 360] }}
          transition={{ duration: s.dur, delay: s.delay, repeat: Infinity, ease: "easeInOut" }}
        >
          ✦
        </motion.div>
      ))}
    </div>
  );
}

// ─── Component: MusicBtn ──────────────────────────────────────────────────────

function MusicBtn({ on, toggle }: { on: boolean; toggle: () => void }) {
  return (
    <motion.button
      className="fixed top-4 right-4 z-50 w-11 h-11 rounded-full flex items-center justify-center"
      style={{
        background: "rgba(255,255,255,0.45)",
        backdropFilter: "blur(14px)",
        border: "1.5px solid rgba(255,214,232,0.65)",
        boxShadow: "0 4px 18px rgba(255,180,214,0.32)",
      }}
      onClick={toggle}
      whileHover={{ scale: 1.12 }}
      whileTap={{ scale: 0.91 }}
      title={on ? "Pause music" : "Play music"}
    >
      <span style={{ fontSize: 17 }}>{on ? "🔇" : "🎵"}</span>
    </motion.button>
  );
}

// ─── Component: HeartBurst ────────────────────────────────────────────────────

function HeartBurst({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div
      className="fixed inset-0 pointer-events-none flex items-center justify-center"
      style={{ zIndex: 45 }}
    >
      {BURST_ANGLES.map((p) => (
        <motion.span
          key={p.id}
          className="absolute"
          style={{ fontSize: p.size, color: p.color }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
          animate={{ x: p.tx, y: p.ty, opacity: 0, scale: 1.4 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          ♥
        </motion.span>
      ))}
    </div>
  );
}

// ─── Component: Landing ───────────────────────────────────────────────────────

function Landing({ onOpen }: { onOpen: () => void }) {
  const [opening, setOpening] = useState(false);
  const [showPaper, setShowPaper] = useState(false);

  const handleClick = () => {
    setOpening(true);
    setTimeout(() => setShowPaper(true), 550);
    setTimeout(onOpen, 1700);
  };

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center gap-8 px-6"
      style={{ zIndex: 10 }}
    >
      {/* Title */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8 }}
      >
        <h1
          style={{
            fontFamily: "'Dancing Script', cursive",
            fontSize: "clamp(26px, 7.5vw, 42px)",
            color: "#8b3d7a",
            lineHeight: 1.35,
            marginBottom: 10,
          }}
        >
          Someone has something
          <br />
          to tell you...
        </h1>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
            color: "#b07090",
            letterSpacing: "0.015em",
            opacity: 0.88,
          }}
        >
          Open this letter and read it until the end.
        </p>
      </motion.div>

      {/* Envelope */}
      <motion.div
        className="relative"
        initial={{ opacity: 0, scale: 0.82 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.55, type: "spring", stiffness: 110, damping: 14 }}
        style={{ width: 280, height: 210, perspective: 1200 }}
      >
        {/* Body */}
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: "rgba(255,255,255,0.84)",
            backdropFilter: "blur(16px)",
            border: "1.5px solid rgba(255,214,232,0.72)",
            boxShadow:
              "0 14px 52px rgba(255,154,200,0.38), 0 4px 14px rgba(220,203,255,0.28)",
            overflow: "hidden",
          }}
        >
          <svg
            viewBox="0 0 280 210"
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="none"
          >
            <polygon points="0,210 280,210 140,120" fill="rgba(255,240,250,0.72)" />
            <line x1="0" y1="210" x2="140" y2="120" stroke="rgba(255,214,232,0.55)" strokeWidth="1" />
            <line x1="280" y1="210" x2="140" y2="120" stroke="rgba(255,214,232,0.55)" strokeWidth="1" />
            <polygon points="0,0 0,210 140,120" fill="rgba(255,248,253,0.52)" />
            <polygon points="280,0 280,210 140,120" fill="rgba(255,248,253,0.52)" />
          </svg>
        </div>

        {/* Flap */}
        <motion.div
          style={{ transformOrigin: "50% 0%", position: "absolute", top: 0, left: 0, right: 0, height: 120, zIndex: 3 }}
          animate={opening ? { rotateX: -175, opacity: 0 } : { rotateX: 0, opacity: 1 }}
          transition={{ duration: 0.95, ease: [0.4, 0, 0.2, 1] }}
        >
          <svg viewBox="0 0 280 120" width="280" height="120">
            <defs>
              <linearGradient id="flapG" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ead8ff" />
                <stop offset="100%" stopColor="#dccbff" />
              </linearGradient>
            </defs>
            <polygon points="0,0 280,0 140,118" fill="url(#flapG)" />
            <polygon points="0,0 280,0 140,118" fill="none" stroke="rgba(200,168,255,0.35)" strokeWidth="1" />
            {/* Wax seal */}
            <circle cx="140" cy="38" r="26" fill="rgba(255,154,200,0.88)" />
            <circle cx="140" cy="38" r="21" fill="rgba(255,107,168,0.93)" stroke="rgba(255,200,228,0.5)" strokeWidth="1.5" />
            <text x="140" y="45" textAnchor="middle" fontSize="22" fill="white">♥</text>
          </svg>
        </motion.div>

        {/* Paper peeking out */}
        <AnimatePresence>
          {showPaper && (
            <motion.div
              className="absolute left-5 right-5 rounded-xl"
              style={{
                background: "rgba(255,255,255,0.96)",
                border: "1px solid rgba(255,214,232,0.45)",
                zIndex: 2,
              }}
              initial={{ top: 55, height: 65, opacity: 0 }}
              animate={{ top: -22, height: 72, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.85, ease: "easeOut" }}
            >
              <div className="flex items-center justify-center h-full">
                <span
                  style={{
                    fontFamily: "'Dancing Script', cursive",
                    fontSize: 13,
                    color: "#c490c0",
                  }}
                >
                  For you, with love...
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* CTA Button */}
      <AnimatePresence>
        {!opening && (
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ delay: 0.85 }}
            onClick={handleClick}
            className="px-9 py-4 rounded-full text-white"
            style={{
              background: "linear-gradient(135deg, #ff9ec8, #c8a0ff)",
              boxShadow: "0 9px 34px rgba(255,154,200,0.52), 0 2px 10px rgba(200,160,255,0.28)",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 15,
              fontWeight: 500,
              letterSpacing: "0.025em",
            }}
            whileHover={{ scale: 1.06, boxShadow: "0 13px 42px rgba(255,154,200,0.68)" }}
            whileTap={{ scale: 0.97 }}
          >
            Open the Letter
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Component: Letter ────────────────────────────────────────────────────────

function Letter({
  onComplete,
  onWarmthInc,
}: {
  onComplete: () => void;
  onWarmthInc: () => void;
}) {
  const [gIdx, setGIdx] = useState(0);
  const [lIdx, setLIdx] = useState(0);
  const [gDone, setGDone] = useState(false);
  const [shown, setShown] = useState<string[]>([]);
  const [burstKey, setBurstKey] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const group = GROUPS[gIdx];
  const line = group?.lines[lIdx] ?? "";
  const { display, done: lineDone } = useTypewriter(line, 40, !gDone);

  // Scroll to bottom as text appears
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [shown, display]);

  // Advance line or complete group when a line finishes
  useEffect(() => {
    if (!lineDone || gDone) return;
    const t = setTimeout(() => {
      const next = lIdx + 1;
      if (next < group.lines.length) {
        setShown((p) => [...p, line]);
        setLIdx(next);
      } else {
        setShown((p) => [...p, line]);
        setGDone(true);
      }
    }, 560);
    return () => clearTimeout(t);
  }, [lineDone, lIdx, group, line, gDone]);

  // Auto-transition for the last group (no Continue button)
  useEffect(() => {
    if (!gDone || !group?.auto) return;
    onWarmthInc();
    const t = setTimeout(onComplete, 2200);
    return () => clearTimeout(t);
  }, [gDone, group?.auto]);

  const handleContinue = () => {
    setBurstKey((k) => k + 1);
    onWarmthInc();
    const next = gIdx + 1;
    if (next >= GROUPS.length) {
      setTimeout(onComplete, 480);
      return;
    }
    setTimeout(() => {
      setGIdx(next);
      setLIdx(0);
      setShown([]);
      setGDone(false);
    }, 480);
  };

  const susp = group?.suspense;

  return (
    <>
      <AnimatePresence>
        {burstKey > 0 && <HeartBurst key={burstKey} active />}
      </AnimatePresence>

      <div
        className="fixed inset-0 flex items-center justify-center p-4"
        style={{ zIndex: 10, paddingTop: 64 }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={gIdx}
            className="w-full max-w-sm rounded-3xl overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.67)",
              backdropFilter: "blur(26px)",
              border: `1.5px solid ${susp ? "rgba(220,203,255,0.6)" : "rgba(255,214,232,0.58)"}`,
              boxShadow: susp
                ? "0 10px 52px rgba(180,120,255,0.28), 0 3px 14px rgba(220,203,255,0.22)"
                : "0 10px 44px rgba(255,180,214,0.3), 0 3px 10px rgba(220,203,255,0.18)",
            }}
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -26 }}
            transition={{ duration: 0.5 }}
          >
            {/* Top accent bar */}
            <div
              style={{
                height: 3,
                background: susp
                  ? "linear-gradient(90deg, #dccbff, #b080ff, #dccbff)"
                  : "linear-gradient(90deg, #ffd6e8, #ff9ec8, #ffd6e8)",
              }}
            />

            <div className="p-7">
              {/* Header divider */}
              <div className="flex items-center gap-3 mb-6">
                <div style={{ flex: 1, height: 1, background: "rgba(255,214,232,0.6)" }} />
                <span
                  style={{
                    fontFamily: "'Dancing Script', cursive",
                    fontSize: 13,
                    color: susp ? "#9b60c0" : "#c090a0",
                    letterSpacing: "0.02em",
                  }}
                >
                  {susp ? "wait a moment..." : "with love"}
                </span>
                <div style={{ flex: 1, height: 1, background: "rgba(255,214,232,0.6)" }} />
              </div>

              {/* Letter content */}
              <div
                ref={scrollRef}
                className="space-y-4 no-scrollbar"
                style={{ minHeight: 88, maxHeight: 260, overflowY: "auto" }}
              >
                {shown.map((l, i) => (
                  <motion.p
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{
                      fontFamily: "'Lora', serif",
                      fontSize: susp ? 15 : 16,
                      color: susp ? "#6b3490" : "#6a3058",
                      lineHeight: 1.8,
                      fontStyle: susp ? "italic" : "normal",
                    }}
                  >
                    {l}
                  </motion.p>
                ))}
                {!gDone && line && (
                  <p
                    style={{
                      fontFamily: "'Lora', serif",
                      fontSize: susp ? 15 : 16,
                      color: susp ? "#6b3490" : "#6a3058",
                      lineHeight: 1.8,
                      fontStyle: susp ? "italic" : "normal",
                    }}
                  >
                    {display}
                    <motion.span
                      animate={{ opacity: [1, 0] }}
                      transition={{ duration: 0.55, repeat: Infinity }}
                      style={{ marginLeft: 1, opacity: 0.7 }}
                    >
                      |
                    </motion.span>
                  </p>
                )}
              </div>

              {/* Continue button */}
              <AnimatePresence>
                {gDone && !group?.auto && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: 0.45, duration: 0.4 }}
                    className="mt-7 flex justify-center"
                  >
                    <motion.button
                      onClick={handleContinue}
                      className="px-8 py-3 rounded-full font-medium"
                      style={{
                        background: group?.last
                          ? "linear-gradient(135deg, #ff9ec8, #c8a0ff)"
                          : "rgba(255,255,255,0.82)",
                        color: group?.last ? "white" : "#a06080",
                        border: group?.last ? "none" : "1.5px solid rgba(255,214,232,0.78)",
                        boxShadow: group?.last
                          ? "0 8px 30px rgba(255,154,200,0.52)"
                          : "0 4px 16px rgba(255,180,214,0.22)",
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 14,
                        backdropFilter: "blur(10px)",
                      }}
                      whileHover={{ scale: 1.06 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      {group?.last ? "I wonder who it could be..." : "Continue ›"}
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}

// ─── Component: Reveal ────────────────────────────────────────────────────────

function Reveal({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const ts = [
      setTimeout(() => setStep(1), 2200),
      setTimeout(() => setStep(2), 3200),
      setTimeout(() => setStep(3), 4200),
      setTimeout(onComplete, 5200),
    ];
    return () => ts.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center px-8"
      style={{ zIndex: 10 }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: 10,
        }}
      >
        <AnimatePresence>
          {step >= 1 && (
            <motion.p
              key="line1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55 }}
              style={{
                fontFamily: "'Dancing Script', cursive",
                fontSize: "clamp(24px, 6vw, 36px)",
                color: "#8b3d7a",
                lineHeight: 1.4,
              }}
            >
              The person I've been talking about
            </motion.p>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {step >= 2 && (
            <motion.p
              key="line2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55 }}
              style={{
                fontFamily: "'Dancing Script', cursive",
                fontSize: "clamp(24px, 6vw, 32px)",
                color: "#a040a0",
                lineHeight: 1.2,
              }}
            >
              Is you
            </motion.p>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {step >= 3 && (
            <motion.p
              key="line3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55 }}
              style={{
                fontFamily: "'Dancing Script', cursive",
                fontSize: "clamp(28px, 7vw, 44px)",
                color: "#d04090",
                lineHeight: 1.2,
                textShadow: "0 0 28px rgba(255,100,180,0.48)",
              }}
            >
              I like you, Alyssa
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Component: HeartFormation ────────────────────────────────────────────────

function HeartFormation() {
  const pts = useMemo(() => makeHeartPts(64, 8), []);
  const starts = useMemo(
    () =>
      pts.map(() => ({
        x: (Math.random() - 0.5) * 340,
        y: (Math.random() - 0.5) * 500,
      })),
    []
  );

  return (
    <div className="relative flex-shrink-0" style={{ width: 296, height: 272 }}>
      {pts.map((pt, i) => (
        <motion.span
          key={i}
          className="absolute"
          style={{
            left: "50%",
            top: "46%",
            fontSize: 12,
            lineHeight: 1,
            userSelect: "none",
            color: i % 5 === 0 ? "#dccbff" : "#ff9ec8",
            filter: "drop-shadow(0 0 4px rgba(255,154,200,0.55))",
          }}
          initial={{ x: starts[i].x - 6, y: starts[i].y - 6, opacity: 0, scale: 0 }}
          animate={{
            x: pt.x - 6,
            y: pt.y - 6,
            opacity: 1,
            scale: [1, 1.18, 1],
          }}
          transition={{
            x: { duration: 1.3, delay: i * 0.018, ease: [0.34, 1.56, 0.64, 1] },
            y: { duration: 1.3, delay: i * 0.018, ease: [0.34, 1.56, 0.64, 1] },
            opacity: { duration: 0.4, delay: i * 0.018 },
            scale: {
              duration: 2.8,
              delay: 1.8 + i * 0.005,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
            },
          }}
        >
          ♥
        </motion.span>
      ))}

      {/* Central glow */}
      <motion.div
        className="absolute rounded-full blur-2xl pointer-events-none"
        style={{
          left: "50%",
          top: "46%",
          width: 140,
          height: 140,
          background: "radial-gradient(circle, rgba(255,154,200,0.48), rgba(220,203,255,0.32), transparent)",
          transform: "translate(-50%, -50%)",
        }}
        animate={{ scale: [1, 1.32, 1], opacity: [0.42, 0.78, 0.42] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

// ─── Component: Final ─────────────────────────────────────────────────────────

function Final({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 1900);
    const t2 = setTimeout(() => setStep(2), 3700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center gap-5 px-5 py-8"
      style={{ zIndex: 10 }}
    >
      <HeartFormation />

      <AnimatePresence>
        {step >= 1 && (
          <motion.div
            key="msg"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-xs rounded-3xl text-center"
            style={{
              background: "rgba(255,255,255,0.62)",
              backdropFilter: "blur(22px)",
              border: "1.5px solid rgba(255,214,232,0.52)",
              boxShadow: "0 10px 44px rgba(255,180,214,0.32)",
              padding: "24px 28px",
            }}
          >
            {[
              "I hope this made you smile.",
              "I've liked you for a while.",
              "Honestly, I don't think I even realized it until one day I noticed I was always looking forward to talking to you.",
            ].map((l, i) => (
              <p
                key={i}
                style={{
                  fontFamily: "'Lora', serif",
                  fontSize: 15,
                  color: "#7a3d6a",
                  lineHeight: 1.8,
                  marginBottom: 8,
                }}
              >
                {l}
              </p>
            ))}
            <p
              style={{
                fontFamily: "'Dancing Script', cursive",
                fontSize: 20,
                color: "#a04080",
                lineHeight: 1.5,
                marginTop: 6,
                marginBottom: 2,
              }}
            >
              So...
            </p>
            <p
              style={{
                fontFamily: "'Dancing Script', cursive",
                fontSize: 20,
                color: "#a04080",
                lineHeight: 1.5,
                marginBottom: 10,
              }}
            >
              When we finally meet...
            </p>
            <p
              style={{
                fontFamily: "'Dancing Script', cursive",
                fontSize: 22,
                color: "#b04080",
                lineHeight: 1.4,
              }}
            >
              Will you let me take you on a date?
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {step >= 2 && (
          <motion.div
            key="btns"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-4"
          >
            <motion.button
              onClick={onComplete}
              className="px-8 py-4 rounded-full text-white"
              style={{
                background: "linear-gradient(135deg, #ff9ec8, #ff6baa)",
                boxShadow: "0 9px 30px rgba(255,107,170,0.58)",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 16,
                fontWeight: 600,
              }}
              whileHover={{ scale: 1.09 }}
              whileTap={{ scale: 0.95 }}
            >
              I'd love to
            </motion.button>
            <motion.button
              onClick={onComplete}
              className="px-8 py-4 rounded-full text-white"
              style={{
                background: "linear-gradient(135deg, #c8a0ff, #a065e8)",
                boxShadow: "0 9px 30px rgba(160,100,232,0.58)",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 16,
                fontWeight: 600,
              }}
              whileHover={{ scale: 1.09 }}
              whileTap={{ scale: 0.95 }}
            >
              I'd love to
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Component: Celebration ───────────────────────────────────────────────────

function Celebration() {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center gap-7 overflow-hidden"
      style={{ zIndex: 10 }}
    >
      {/* Heart rain */}
      {RAIN.map((h) => (
        <motion.div
          key={h.id}
          className="fixed pointer-events-none select-none"
          style={{ left: h.left, top: -65, fontSize: h.size, color: h.color }}
          animate={{ y: "120vh", rotate: [-18, 18, -18], opacity: [1, 1, 0.2] }}
          transition={{ duration: h.dur, delay: h.delay, repeat: Infinity, ease: "linear" }}
        >
          ♥
        </motion.div>
      ))}

      {/* Pulsing large heart */}
      <motion.div
        animate={{ scale: [1, 1.12, 1] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        style={{
          fontSize: 96,
          lineHeight: 1,
          filter: "drop-shadow(0 0 28px rgba(255,120,180,0.72))",
        }}
      >
        ♥
      </motion.div>

      {/* Final message */}
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.8 }}
        style={{
          background: "rgba(255,255,255,0.58)",
          backdropFilter: "blur(18px)",
          borderRadius: 28,
          padding: "26px 36px",
          border: "1.5px solid rgba(255,214,232,0.55)",
          boxShadow: "0 10px 44px rgba(255,154,200,0.38)",
          textAlign: "center",
          maxWidth: 340,
        }}
      >
        <p
          style={{
            fontFamily: "'Dancing Script', cursive",
            fontSize: "clamp(22px, 7vw, 36px)",
            color: "#c84090",
            lineHeight: 1.55,
          }}
        >
          I guess this is where our story starts.
        </p>
      </motion.div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [phase, setPhase] = useState<Phase>("landing");
  const [warmthLevel, setWarmthLevel] = useState(0);
  const [musicOn, setMusicOn] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const audio = new Audio(MUSIC_URL);
    audio.loop = true;
    audio.volume = 0;
    audioRef.current = audio;
    return () => { audio.pause(); audio.src = ""; };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const audio = audioRef.current;
      if (audio) {
        audio.play().catch(() => {});
        fadeRef.current = fadeAudio(audio, 0.55);
        setMusicOn(true);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const startMusic = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (fadeRef.current) clearInterval(fadeRef.current);
    audio.play().catch(() => {});
    fadeRef.current = fadeAudio(audio, 0.55);
    setMusicOn(true);
  }, []);

  const toggleMusic = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (fadeRef.current) clearInterval(fadeRef.current);
    if (musicOn) {
      fadeRef.current = fadeAudio(audio, 0);
      setTimeout(() => audio.pause(), 1450);
      setMusicOn(false);
    } else {
      audio.play().catch(() => {});
      fadeRef.current = fadeAudio(audio, 0.55);
      setMusicOn(true);
    }
  }, [musicOn]);

  const warmth =
    phase === "celebration"
      ? 1
      : phase === "final"
      ? 0.92
      : phase === "reveal"
      ? 0.8
      : warmthLevel / 8;

  const handleRevealDone = useCallback(() => setPhase("final"), []);
  const handleFinalDone = useCallback(() => setPhase("celebration"), []);
  const handleLetterDone = useCallback(() => setPhase("reveal"), []);
  const handleWarmthInc = useCallback(() => setWarmthLevel((l) => Math.min(7, l + 1)), []);

  return (
    <div className="w-full min-h-screen overflow-hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <Background warmth={warmth} />
      <MusicBtn on={musicOn} toggle={toggleMusic} />

      <AnimatePresence mode="wait">
        {phase === "landing" && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65 }}
          >
            <Landing onOpen={() => { setPhase("letter"); startMusic(); }} />
          </motion.div>
        )}

        {phase === "letter" && (
          <motion.div
            key="letter"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65 }}
          >
            <Letter onComplete={handleLetterDone} onWarmthInc={handleWarmthInc} />
          </motion.div>
        )}

        {phase === "reveal" && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          >
            <Reveal onComplete={handleRevealDone} />
          </motion.div>
        )}

        {phase === "final" && (
          <motion.div
            key="final"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.85 }}
          >
            <Final onComplete={handleFinalDone} />
          </motion.div>
        )}

        {phase === "celebration" && (
          <motion.div
            key="celebration"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.85 }}
          >
            <Celebration />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
