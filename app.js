/* Schoolyard Shuffle - Minimal, ultra-stable build
   - No settings modal
   - No overlays
   - No sound
   - Three modes: teams / loser / winner
*/

const $ = (id) => document.getElementById(id);

const screens = {
  home: $("screenHome"),
  setup: $("screenSetup"),
  game: $("screenGame"),
};

const ui = {
  // Home
  pwaStatus: $("pwaStatus"),
  subtitle: $("subtitle"),

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

const state = {
  mode: "teams",
  participants: 10,
  teams: 2,
  tiles: [],
  revealedCount: 0,
};

function showScreen(name) {
  Object.values(screens).forEach((s) => s && s.classList.remove("active"));
  if (screens[name]) screens[name].classList.add("active");
}

function toast(msg) {
  if (!ui.toast) return;
  ui.toast.textContent = msg;
  ui.toast.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (ui.toast.hidden = true), 1400);
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

/* -------------------- Setup -------------------- */

function setupScreenForMode(mode) {
  const meta = MODE_META[mode];
  if (!meta) return;

  if (ui.setupTitle) ui.setupTitle.textContent = meta.setupTitle;
  if (ui.setupDesc) ui.setupDesc.textContent = meta.setupDesc;
  if (ui.participantsLabel) ui.participantsLabel.textContent = meta.participantsLabel;

  if (ui.teamsField) ui.teamsField.hidden = !meta.needsTeams;

  if (ui.participantsInput) ui.participantsInput.value = String(state.participants || 10);
  if (mode === "teams" && ui.teamsInput) ui.teamsInput.value = String(state.teams || 2);

  // Keep subtitle simple
  if (ui.subtitle) ui.subtitle.textContent = "Settle it with tiles.";
}

function applySetupForm() {
  const p = clampInt(ui.participantsInput?.value, 2, 200, 10);
  state.participants = p;

  if (state.mode === "teams") {
    const t = clampInt(ui.teamsInput?.value, 2, 20, 2);
    state.teams = Math.min(t, p);
  }
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

/* -------------------- Tiles -------------------- */

function buildTiles() {
  state.revealedCount = 0;

  const n = state.participants;
  const mode = state.mode;

  if (mode === "teams") {
    const t = state.teams;

    const base = Math.floor(n / t);
    const rem = n % t;

    const palette = TEAM_PALETTE.slice(0, Math.min(t, TEAM_PALETTE.length));
    const tiles = [];

    for (let teamIndex = 0; teamIndex < t; teamIndex++) {
      const count = base + (teamIndex < rem ? 1 : 0);
      const team = palette[teamIndex] || {
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
  if (state.mode === "teams") {
    return {
      top: tile.label,
      sub: "That’s your team. No whining.",
      accent: tile.color,
    };
  }

  if (state.mode === "loser") {
    if (tile.kind === "loser") {
      return {
        top: "💩 CERTIFIED L",
        sub: "Oof. That’s you.",
        accent: "#ff3b6b",
      };
    }
    return {
      top: "✅ SAFE",
      sub: "Not you. This time.",
      accent: "#44d07b",
    };
  }

  // winner mode
  if (tile.kind === "winner") {
    return {
      top: "👑 WINNER",
      sub: "Big W energy.",
      accent: "#facc15",
    };
  }
  return {
    top: "😎 NOT YOU",
    sub: "Try again.",
    accent: "#60a5fa",
  };
}

function updateGameHeader() {
  if (ui.modePill) ui.modePill.textContent = modeLabel(state.mode);
  if (ui.countPill) ui.countPill.textContent = `${state.revealedCount} / ${state.tiles.length} flipped`;

  const meta = MODE_META[state.mode];
  if (ui.gameTitle && meta) ui.gameTitle.textContent = meta.title;

  if (ui.gameSub) {
    if (state.mode === "teams") ui.gameSub.textContent = "Flip a tile to find your team.";
    else if (state.mode === "loser") ui.gameSub.textContent = "Flip until someone takes the L.";
    else ui.gameSub.textContent = "Flip until someone gets the W.";
  }

  if (ui.tensionNote) ui.tensionNote.textContent = "";
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

    ui.board.appendChild(btn);
  });
}

function onBoardClick(e) {
  const btn = e.target.closest(".tile");
  if (!btn) return;

  const idx = parseInt(btn.dataset.index, 10);
  const tile = state.tiles[idx];
  if (!tile || tile.revealed) return;

  tile.revealed = true;
  state.revealedCount += 1;

  applyReveal(btn, tile);
  updateGameHeader();

  if (state.mode === "loser" && tile.kind === "loser") toast("Certified L.");
  if (state.mode === "winner" && tile.kind === "winner") toast("Winner!");
}

/* -------------------- Flow -------------------- */

function startSetup(mode) {
  state.mode = mode;
  setupScreenForMode(mode);
  showScreen("setup");
}

function startGameFromSetup() {
  buildTiles();
  updateGameHeader();
  renderBoard();
  showScreen("game");
}

function runItBack() {
  buildTiles();
  updateGameHeader();
  renderBoard();
  toast("Shuffled.");
}

/* -------------------- PWA -------------------- */

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

/* -------------------- Events -------------------- */

function wireEvents() {
  // Home mode selection
  if (screens.home) {
    screens.home.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-mode]");
      if (!btn) return;
      startSetup(btn.dataset.mode);
    });
  }

  // Setup
  if (ui.backHomeBtn) ui.backHomeBtn.addEventListener("click", () => showScreen("home"));
  if (ui.randomizeBtn) ui.randomizeBtn.addEventListener("click", randomizeNumbers);

  if (ui.setupForm) {
    ui.setupForm.addEventListener("submit", (e) => {
      e.preventDefault();
      applySetupForm();
      startGameFromSetup();
    });
  }

  // Game
  if (ui.backSetupBtn) ui.backSetupBtn.addEventListener("click", () => showScreen("setup"));
  if (ui.newSetupBtn) ui.newSetupBtn.addEventListener("click", () => showScreen("setup"));
  if (ui.playAgainBtn) ui.playAgainBtn.addEventListener("click", runItBack);

  // Board
  if (ui.board) ui.board.addEventListener("click", onBoardClick);
}

/* -------------------- Init -------------------- */

function init() {
  initPwa();
  wireEvents();
  showScreen("home");
}

init();
