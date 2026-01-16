/* Schoolyard Shuffle - static PWA, teen-voice, three modes, smooth overlays (full file) */

const $ = (id) => document.getElementById(id);

const screens = {
  home: $("screenHome"),
  setup: $("screenSetup"),
  game: $("screenGame"),
};

const ui = {
  subtitle: $("subtitle"),
  pwaStatus: $("pwaStatus"),

  // Setup
  setupTitle: $("setupTitle"),
  setupDesc: $("setupDesc"),
  participantsLabel: $("participantsLabel"),
  participantsInput: $("participantsInput"),
  teamsField: $("teamsField"),
  teamsInput: $("teamsInput"),
  setupForm: $("setupForm"),
  randomizeBtn: $("randomizeBtn"),
  backHomeBtn: $("backHomeBtn"),

  // Game
  gameTitle: $("gameTitle"),
  gameSub: $("gameSub"),
  modePill: $("modePill"),
  countPill: $("countPill"),
  board: $("board"),
  playAgainBtn: $("playAgainBtn"),
  newSetupBtn: $("newSetupBtn"),
  backSetupBtn: $("backSetupBtn"),
  tensionNote: $("tensionNote"),

  // Settings
  settingsBackdrop: $("settingsBackdrop"),
  openSettingsBtn: $("openSettingsBtn"),
  closeSettingsBtn: $("closeSettingsBtn"),
  unhingedToggle: $("unhingedToggle"), // label in UI may say "Extra chaos"
  passPhoneToggle: $("passPhoneToggle"),
  soundToggle: $("soundToggle"),

  // Pass-the-phone overlay
  passOverlay: $("passOverlay"),
  nextPlayerBtn: $("nextPlayerBtn"),

  // Toast
  toast: $("toast"),
};

const MODE_META = {
  teams: {
    title: "Pick Teams",
    setupTitle: "Pick Teams",
    setupDesc: "How many players and how many teams?",
    participantsLabel: "Players",
    needsTeams: true,
    emoji: "🎨",
  },
  loser: {
    title: "Pick a Loser",
    setupTitle: "Pick a Loser",
    setupDesc: "How many participants are about to tempt fate?",
    participantsLabel: "Participants",
    needsTeams: false,
    emoji: "💩",
  },
  winner: {
    title: "Pick a Winner",
    setupTitle: "Pick a Winner",
    setupDesc: "How many participants are chasing the W?",
    participantsLabel: "Participants",
    needsTeams: false,
    emoji: "👑",
  },
};

const TEAM_PALETTE = [
  { name: "Team Violet", color: "#7c5cff" },
  { name: "Team Teal", color: "#2dd4bf" },
  { name: "Team Pink", color: "#ff3b6b" },
  { name: "Team Lime", color: "#a3e635" },
  { name: "Team Blue", color: "#60a5fa" },
  { name: "Team Orange", color: "#fb923c" },
  { name: "Team Yellow", color: "#facc15" },
  { name: "Team Red", color: "#f87171" },
];

const UNHINGED_LOSER_LINES = [
  "That’s tough.",
  "Skill issue.",
  "Unlucky, buddy.",
  "You knew it was coming.",
  "Pack it up.",
  "The tiles have spoken.",
  "This is your villain origin story.",
];

const UNHINGED_SAFE_LINES = [
  "Not you. This time.",
  "Dodged it.",
  "Survived another round.",
  "Lucky. Don’t flex.",
  "You live… for now.",
];

const UNHINGED_WINNER_LINES = [
  "Built different.",
  "Main character energy.",
  "Absolute W.",
  "The prophecy is real.",
  "Congrats. Don’t get annoying about it.",
];

const state = {
  mode: "teams",
  participants: 10,
  teams: 2,
  tiles: [],
  revealedCount: 0,

  // Overlay state prevents re-show glitches
  overlay: {
    passOpen: false,
    suppressUntil: 0, // timestamp to ignore immediate re-open after close
  },

  settings: {
    unhinged: false,
    passPhone: true,
    sound: false,
  },
};

/* ------------------------------ helpers ------------------------------ */

function showScreen(name) {
  Object.values(screens).forEach((s) => s && s.classList.remove("active"));
  if (screens[name]) screens[name].classList.add("active");
}

function toast(msg) {
  if (!ui.toast) return;
  ui.toast.textContent = msg;
  ui.toast.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (ui.toast.hidden = true), 1700);
}

function clampInt(value, min, max, fallback) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function modeLabel(mode) {
  const meta = MODE_META[mode];
  return meta ? `${meta.emoji} ${meta.title}` : "Mode";
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ------------------------------ theme/settings ------------------------------ */

function setTheme() {
  document.body.classList.toggle("unhinged", state.settings.unhinged);
  if (ui.subtitle) {
    ui.subtitle.textContent = state.settings.unhinged
      ? "Random. Fair. Extra chaos."
      : "Settle it with tiles.";
  }
}

function saveSettings() {
  localStorage.setItem("sys_settings", JSON.stringify(state.settings));
}

function loadSettings() {
  try {
    const raw = localStorage.getItem("sys_settings");
    if (!raw) return;
    const s = JSON.parse(raw);
    if (typeof s?.unhinged === "boolean") state.settings.unhinged = s.unhinged;
    if (typeof s?.passPhone === "boolean") state.settings.passPhone = s.passPhone;
    if (typeof s?.sound === "boolean") state.settings.sound = s.sound;
  } catch {
    // ignore
  }
}

function syncSettingsUI() {
  if (ui.unhingedToggle) ui.unhingedToggle.checked = state.settings.unhinged;
  if (ui.passPhoneToggle) ui.passPhoneToggle.checked = state.settings.passPhone;
  if (ui.soundToggle) ui.soundToggle.checked = state.settings.sound;
  setTheme();
}

/* ------------------------------ overlays (smooth + reliable) ------------------------------ */

function openPassOverlay() {
  if (!state.settings.passPhone) return;
  if (state.overlay.passOpen) return;
  if (Date.now() < state.overlay.suppressUntil) return;

  state.overlay.passOpen = true;

  if (!ui.passOverlay) return;
  ui.passOverlay.hidden = false;
  ui.passOverlay.style.display = "grid"; // ensure visible
}

function closePassOverlay() {
  state.overlay.passOpen = false;
  state.overlay.suppressUntil = Date.now() + 250;

  if (!ui.passOverlay) return;
  ui.passOverlay.hidden = true;
  ui.passOverlay.style.display = "none";
}

function openSettings() {
  if (!ui.settingsBackdrop) return;
  ui.settingsBackdrop.hidden = false;
  ui.settingsBackdrop.style.display = "grid";
}

function closeSettings() {
  if (!ui.settingsBackdrop) return;
  ui.settingsBackdrop.hidden = true;
  ui.settingsBackdrop.style.display = "none";
  requestAnimationFrame(() => {
    // restore default CSS behavior for next open
    ui.settingsBackdrop.style.display = "";
  });
}

/* ------------------------------ tiles/game logic ------------------------------ */

function setupScreenForMode(mode) {
  const meta = MODE_META[mode];
  if (!meta) return;

  if (ui.setupTitle) ui.setupTitle.textContent = meta.setupTitle;
  if (ui.setupDesc) ui.setupDesc.textContent = meta.setupDesc;
  if (ui.participantsLabel) ui.participantsLabel.textContent = meta.participantsLabel;

  if (ui.teamsField) ui.teamsField.hidden = !meta.needsTeams;

  if (ui.participantsInput) ui.participantsInput.value = String(state.participants || 10);
  if (mode === "teams" && ui.teamsInput) ui.teamsInput.value = String(state.teams || 2);
}

function buildTiles() {
  state.revealedCount = 0;

  const n = state.participants;
  const mode = state.mode;

  if (mode === "teams") {
    const t = state.teams;

    const base = Math.floor(n / t);
    const rem = n % t;

    const chosenPalette = TEAM_PALETTE.slice(0, Math.min(t, TEAM_PALETTE.length));
    const tiles = [];

    for (let teamIndex = 0; teamIndex < t; teamIndex++) {
      const count = base + (teamIndex < rem ? 1 : 0);
      const team = chosenPalette[teamIndex] || {
        name: `Team ${teamIndex + 1}`,
        color: "#ffffff",
      };

      for (let i = 0; i < count; i++) {
        tiles.push({
          kind: "team",
          revealed: false,
          label: team.name,
          color: team.color,
        });
      }
    }

    state.tiles = shuffle(tiles);
    return;
  }

  if (mode === "loser") {
    const tiles = [];
    for (let i = 0; i < n - 1; i++) tiles.push({ kind: "safe", revealed: false });
    tiles.push({ kind: "loser", revealed: false });
    state.tiles = shuffle(tiles);
    return;
  }

  if (mode === "winner") {
    const tiles = [];
    for (let i = 0; i < n - 1; i++) tiles.push({ kind: "notWinner", revealed: false });
    tiles.push({ kind: "winner", revealed: false });
    state.tiles = shuffle(tiles);
    return;
  }
}

function revealTextFor(tile) {
  const unhinged = state.settings.unhinged;

  if (state.mode === "teams") {
    return {
      top: tile.label,
      sub: unhinged ? "Congrats. Don’t get annoying about it." : "That’s your team. No whining.",
      accent: tile.color,
    };
  }

  if (state.mode === "loser") {
    if (tile.kind === "loser") {
      return {
        top: "💩 CERTIFIED L",
        sub: unhinged
          ? UNHINGED_LOSER_LINES[Math.floor(Math.random() * UNHINGED_LOSER_LINES.length)]
          : "Oof. That’s you.",
        accent: "#ff3b6b",
      };
    }
    return {
      top: "✅ SAFE",
      sub: unhinged
        ? UNHINGED_SAFE_LINES[Math.floor(Math.random() * UNHINGED_SAFE_LINES.length)]
        : "Not you. This time.",
      accent: "#44d07b",
    };
  }

  if (tile.kind === "winner") {
    return {
      top: "👑 WINNER",
      sub: unhinged
        ? UNHINGED_WINNER_LINES[Math.floor(Math.random() * UNHINGED_WINNER_LINES.length)]
        : "Big W energy.",
      accent: "#facc15",
    };
  }

  return {
    top: "😎 NOT YOU",
    sub: unhinged ? "Better luck. Don’t rage quit." : "Try again.",
    accent: "#60a5fa",
  };
}

function playSound(type) {
  if (!state.settings.sound) return;

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  const ctx = playSound._ctx || (playSound._ctx = new AudioCtx());
  const o = ctx.createOscillator();
  const g = ctx.createGain();

  o.connect(g);
  g.connect(ctx.destination);

  const now = ctx.currentTime;

  let freq = 440;
  let dur = 0.08;
  let vol = 0.04;

  if (type === "flip") { freq = 520; dur = 0.05; vol = 0.03; }
  if (type === "winner") { freq = 740; dur = 0.12; vol = 0.05; }
  if (type === "loser") { freq = 160; dur = 0.14; vol = 0.06; }

  o.frequency.setValueAtTime(freq, now);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(vol, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  o.start(now);
  o.stop(now + dur + 0.02);
}

function maybeShowTensionNote() {
  if (!ui.tensionNote) return;

  if (!state.settings.unhinged) {
    ui.tensionNote.textContent = "";
    return;
  }

  const remaining = state.tiles.length - state.revealedCount;
  if (remaining === 2) ui.tensionNote.textContent = "It’s about to be personal.";
  else if (remaining === 1) ui.tensionNote.textContent = "One tile left. Everyone breathe.";
  else ui.tensionNote.textContent = "";
}

function updateGameHeader() {
  if (ui.modePill) ui.modePill.textContent = modeLabel(state.mode);
  if (ui.countPill) ui.countPill.textContent = `${state.revealedCount} / ${state.tiles.length} flipped`;

  const meta = MODE_META[state.mode];
  if (ui.gameTitle && meta) ui.gameTitle.textContent = meta.title;

  if (ui.gameSub) {
    if (state.mode === "teams") {
      ui.gameSub.textContent = state.settings.unhinged
        ? "Flip a tile. Accept your destiny."
        : "Flip a tile to find your team.";
    } else if (state.mode === "loser") {
      ui.gameSub.textContent = state.settings.unhinged ? "Flip & suffer." : "Flip until someone takes the L.";
    } else {
      ui.gameSub.textContent = state.settings.unhinged
        ? "Flip until the prophecy is fulfilled."
        : "Flip until someone gets the W.";
    }
  }

  maybeShowTensionNote();
}

function renderBoard() {
  if (!ui.board) return;
  ui.board.innerHTML = "";

  state.tiles.forEach((tile, idx) => {
    const btn = document.createElement("button");
    btn.className = "tile";
    btn.type = "button";
    btn.setAttribute("aria-label", `Tile ${idx + 1}`);
    btn.dataset.index = String(idx);

    const face = document.createElement("div");
    face.className = "face";
    face.textContent = "TAP";
    btn.appendChild(face);

    if (tile.revealed) applyReveal(btn, tile);

    ui.board.appendChild(btn);
  });
}

function applyReveal(tileEl, tile) {
  tileEl.classList.add("revealed");
  tileEl.disabled = true;

  const txt = revealTextFor(tile);
  tileEl.style.borderColor = `${txt.accent}55`;
  tileEl.style.boxShadow = `0 0 0 1px ${txt.accent}22 inset`;

  const face = tileEl.querySelector(".face");
  face.innerHTML = `<div style="font-size:13px;font-weight:1000">${escapeHtml(txt.top)}</div>
                    <div style="font-size:11px;opacity:.85;margin-top:4px">${escapeHtml(txt.sub)}</div>`;

  if (state.mode === "loser" && tile.kind === "loser") playSound("loser");
  else if (state.mode === "winner" && tile.kind === "winner") playSound("winner");
  else playSound("flip");
}

function onBoardClick(e) {
  if (state.overlay.passOpen) return;

  const btn = e.target.closest(".tile");
  if (!btn) return;

  const idx = parseInt(btn.dataset.index, 10);
  const tile = state.tiles[idx];
  if (!tile || tile.revealed) return;

  tile.revealed = true;
  state.revealedCount += 1;

  applyReveal(btn, tile);
  updateGameHeader();

  if (state.settings.passPhone && state.revealedCount < state.tiles.length) {
    openPassOverlay();
  }

  if (state.mode === "loser" && tile.kind === "loser") {
    toast(state.settings.unhinged ? "CERTIFIED L. RIP." : "Certified L.");
  }
  if (state.mode === "winner" && tile.kind === "winner") {
    toast(state.settings.unhinged ? "Built different." : "Winner!");
  }
}

function applySetupForm() {
  const p = clampInt(ui.participantsInput?.value, 2, 200, 10);
  state.participants = p;

  if (state.mode === "teams") {
    const t = clampInt(ui.teamsInput?.value, 2, 20, 2);
    state.teams = Math.min(t, p);
  }
}

function startSetup(mode) {
  state.mode = mode;
  setupScreenForMode(mode);
  showScreen("setup");
}

function startGameFromSetup() {
  closePassOverlay();
  buildTiles();
  updateGameHeader();
  renderBoard();
  showScreen("game");
}

function runItBack() {
  closePassOverlay();
  buildTiles();
  updateGameHeader();
  renderBoard();
  toast(state.settings.unhinged ? "Chaos reloaded." : "Shuffled.");
}

function randomizeNumbers() {
  const p = clampInt(Math.floor(6 + Math.random() * 25), 2, 200, 10);
  if (ui.participantsInput) ui.participantsInput.value = String(p);

  if (state.mode === "teams" && ui.teamsInput) {
    const maxTeams = Math.min(6, Math.max(2, Math.floor(p / 2)));
    const t = clampInt(2 + Math.floor(Math.random() * (maxTeams - 1)), 2, 20, 2);
    ui.teamsInput.value = String(t);
  }

  toast("Numbers shuffled.");
}

/* ------------------------------ PWA ------------------------------ */

function initPwa() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }

  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    deferredPrompt = e;
    if (ui.pwaStatus) ui.pwaStatus.textContent = "📲 Installable PWA (tap ⋮ → Add to Home screen)";
  });

  setTimeout(() => {
    if (!deferredPrompt) {
      if (ui.pwaStatus) ui.pwaStatus.textContent = "📱 Add to Home Screen for the “app” vibe";
    }
  }, 1200);
}

/* ------------------------------ wiring ------------------------------ */

function wireEvents() {
  // Home mode selection
  if (screens.home) {
    screens.home.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-mode]");
      if (!btn) return;
      startSetup(btn.dataset.mode);
    });
  }

  // Setup nav
  if (ui.backHomeBtn) {
    ui.backHomeBtn.addEventListener("click", () => {
      closePassOverlay();
      showScreen("home");
    });
  }

  if (ui.randomizeBtn) ui.randomizeBtn.addEventListener("click", randomizeNumbers);

  if (ui.setupForm) {
    ui.setupForm.addEventListener("submit", (e) => {
      e.preventDefault();
      applySetupForm();
      startGameFromSetup();
    });
  }

  // Game nav
  if (ui.backSetupBtn) {
    ui.backSetupBtn.addEventListener("click", () => {
      closePassOverlay();
      showScreen("setup");
    });
  }

  if (ui.newSetupBtn) {
    ui.newSetupBtn.addEventListener("click", () => {
      closePassOverlay();
      showScreen("setup");
    });
  }

  if (ui.playAgainBtn) ui.playAgainBtn.addEventListener("click", runItBack);

  // Board click
  if (ui.board) ui.board.addEventListener("click", onBoardClick);

  // Settings modal open/close
  if (ui.openSettingsBtn) ui.openSettingsBtn.addEventListener("click", openSettings);
  if (ui.closeSettingsBtn) ui.closeSettingsBtn.addEventListener("click", closeSettings);

  // Click outside modal closes it
  if (ui.settingsBackdrop) {
    ui.settingsBackdrop.addEventListener("click", (e) => {
      if (e.target === ui.settingsBackdrop) closeSettings();
    });
  }

  // Toggles
  if (ui.passPhoneToggle) {
    ui.passPhoneToggle.addEventListener("change", () => {
      state.settings.passPhone = ui.passPhoneToggle.checked;
      saveSettings();
      if (!state.settings.passPhone) closePassOverlay();
    });
  }

  if (ui.soundToggle) {
    ui.soundToggle.addEventListener("change", () => {
      state.settings.sound = ui.soundToggle.checked;
      saveSettings();
      toast(state.settings.sound ? "Sound on." : "Sound off.");
    });
  }

  if (ui.unhingedToggle) {
    ui.unhingedToggle.addEventListener("change", () => {
      state.settings.unhinged = ui.unhingedToggle.checked;
      setTheme();
      saveSettings();
      toast(state.settings.unhinged ? "Extra chaos: ON 😈" : "Extra chaos: OFF 😇");
      updateGameHeader();
    });
  }

  // Pass overlay close
  if (ui.nextPlayerBtn) {
    ui.nextPlayerBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      closePassOverlay();
    });
  }

  if (ui.passOverlay) {
    ui.passOverlay.addEventListener("click", (e) => {
      if (e.target === ui.passOverlay) closePassOverlay();
    });
  }

  // Escape closes overlays
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeSettings();
      closePassOverlay();
    }
  });
}

/* ------------------------------ init ------------------------------ */

function init() {
  loadSettings();
  syncSettingsUI();
  initPwa();
  wireEvents();
  closePassOverlay();
  showScreen("home");
}

init();
