console.log("%cHey there, curious explorer! 🐧", "color: green; font-size: 18px; font-weight: bold;");
console.log("This site is proudly made by a student who loves efficiency, control, and penguins.");
console.log(`
   .--.
  |o_o |
  |:_/ |
 //   \\ \\
(|     | )
/'\\_   _/\\'
\\___)=(___/
`);
console.log("Welcome to the Terminal Underground! 🐧");

const REPO_OWNER = "Pizzafliper030";
const REPO_NAME = "SwitchToLinuxSchProject";
const GH_API_HEADERS = {
  "Accept": "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28"
};

// Shared sessionStorage cache helper used by both the deploy-time and
// star-count fetches below, so the same-tab-only, time-limited caching
// logic only needs to exist once.
function readCache(key, ttlMs) {
  const cached = sessionStorage.getItem(key);
  if (!cached) return null;
  const { value, savedAt } = JSON.parse(cached);
  return Date.now() - savedAt < ttlMs ? value : null;
}

function writeCache(key, value) {
  sessionStorage.setItem(key, JSON.stringify({ value, savedAt: Date.now() }));
}

// DevTools easter egg — event-driven instead of polling every 500ms forever
let devtoolsOpen = false;
function checkDevTools() {
  const widthThreshold = window.outerWidth - window.innerWidth > 100;
  const heightThreshold = window.outerHeight - window.innerHeight > 100;
  if ((widthThreshold || heightThreshold) && !devtoolsOpen) {
    console.log("%cSpotted you with DevTools open! 👀", "color: orange; font-size: 16px;");
    devtoolsOpen = true;
  }
}
window.addEventListener("resize", checkDevTools, { passive: true });
checkDevTools();

// Respect reduced-motion preference: pause the background video for
// anyone who's asked their OS/browser to cut down on motion
const bgVideo = document.querySelector(".bg-video");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
if (bgVideo && prefersReducedMotion.matches) {
  bgVideo.pause();
  bgVideo.removeAttribute("autoplay");
}

// Scroll reveal: sections fade/slide in as they enter the viewport.
// The "reveal" class is added here (not in the HTML) on purpose — if JS
// never runs, sections keep their default full opacity instead of being
// stuck invisible. Skipped entirely for reduced-motion users.
(function setupScrollReveal() {
  if (prefersReducedMotion.matches) return;
  if (!("IntersectionObserver" in window)) return;

  const targets = document.querySelectorAll("main section, footer, .distro-card");
  if (!targets.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle("is-visible", entry.isIntersecting);
    });
  }, { threshold: 0.15 });

  targets.forEach((el) => {
    el.classList.add("reveal");
    observer.observe(el);
  });
})();

// Inertia scroll: instead of jumping straight to the native wheel-delta
// position, we ease toward a "target" scroll position every animation
// frame. This is the scroll equivalent of frame interpolation — it doesn't
// raise your actual refresh rate, it just removes the abrupt per-wheel-tick
// jumps so motion reads as smoother at the same 60Hz.
//
// Deliberately scoped to fine-pointer devices only (mouse/trackpad wheel).
// Touch scrolling already has its own OS-level momentum and re-hijacking it
// tends to feel worse, not better. Keyboard scrolling (Space, Page Down,
// arrow keys) is untouched since we only listen for "wheel" events.
(function setupInertiaScroll() {
  if (prefersReducedMotion.matches) return;
  if (window.matchMedia("(pointer: coarse)").matches) return;

  let currentY = window.scrollY;
  let targetY = window.scrollY;
  let rafId = null;
  const EASE = 0.2; // lower = smoother/laggier catch-up, higher = snappier

  function clampTarget() {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    targetY = Math.min(Math.max(targetY, 0), maxScroll);
  }

  function tick() {
    currentY += (targetY - currentY) * EASE;

    if (Math.abs(targetY - currentY) < 0.5) {
      currentY = targetY;
      window.scrollTo(0, currentY);
      rafId = null;
      return;
    }

    window.scrollTo(0, currentY);
    rafId = requestAnimationFrame(tick);
  }

  window.addEventListener("wheel", (e) => {
    e.preventDefault();
    targetY += e.deltaY;
    clampTarget();
    if (!rafId) rafId = requestAnimationFrame(tick);
  }, { passive: false });

  // If the user scrolls some other way (keyboard, drag-scrollbar), keep
  // our virtual position in sync so the next wheel tick doesn't jump.
  window.addEventListener("scroll", () => {
    if (!rafId) {
      currentY = window.scrollY;
      targetY = window.scrollY;
    }
  }, { passive: true });
})();

// Distro fan rotation: rotates the composite logo image based on its own
// scroll position, not a running scroll total. That's what makes it
// naturally reverse when scrolling back up — the rotation is always a
// direct function of "how far through the viewport is this element right
// now," so decreasing that value spins it back the other way for free.
(function setupDistroFanRotation() {
  const el = document.querySelector(".distro-fan-img");
  if (!el || prefersReducedMotion.matches) return;

  // Devices with inertia scroll active (fine-pointer/desktop) get extra
  // spin on top of the base rotation, since the smoothed scroll motion
  // makes a faster spin feel proportionate. Touch devices (no inertia
  // scroll) keep the standard single 360 rotation.
  const hasInertiaScroll = !window.matchMedia("(pointer: coarse)").matches;
  const MAX_DEGREES = hasInertiaScroll ? 540 : 360;
  const EASE = 0.25;

  let targetAngle = 0;
  let currentAngle = 0;
  let rafId = null;

  function computeTargetAngle() {
    const rect = el.getBoundingClientRect();
    const viewportH = window.innerHeight;
    let progress = 1 - (rect.top + rect.height / 2) / (viewportH + rect.height);
    progress = Math.min(Math.max(progress, 0), 1);
    targetAngle = -(progress * MAX_DEGREES);
  }

  // Eases toward the target each frame instead of using a fixed-duration
  // CSS transition — that way a big scroll jump still smooths out, but it
  // settles as soon as it catches up rather than always running for a
  // fixed time after scrolling has already stopped.
  function tick() {
    currentAngle += (targetAngle - currentAngle) * EASE;

    if (Math.abs(targetAngle - currentAngle) < 0.1) {
      currentAngle = targetAngle;
      el.style.transform = `rotate(${currentAngle}deg)`;
      rafId = null;
      return;
    }

    el.style.transform = `rotate(${currentAngle}deg)`;
    rafId = requestAnimationFrame(tick);
  }

  window.addEventListener("scroll", () => {
    computeTargetAngle();
    if (!rafId) rafId = requestAnimationFrame(tick);
  }, { passive: true });

  computeTargetAngle();
  currentAngle = targetAngle;
  el.style.transform = `rotate(${currentAngle}deg)`;
})();

function formatDeployText(isoString) {
  const deployedAt = new Date(isoString);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const diffMinutes = Math.round((deployedAt - Date.now()) / 60000);

  const relative =
    Math.abs(diffMinutes) < 60
      ? rtf.format(diffMinutes, "minute")
      : Math.abs(diffMinutes) < 1440
        ? rtf.format(Math.round(diffMinutes / 60), "hour")
        : rtf.format(Math.round(diffMinutes / 1440), "day");

  return `🕒 Last deployed: ${deployedAt.toLocaleString()} (${relative})`;
}

async function fetchLastDeployTime() {
  const el = document.getElementById("deploy-time");
  if (!el) return;

  const cachedText = readCache("deployTimeCache", 5 * 60 * 1000);
  if (cachedText) {
    el.textContent = cachedText;
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    // The Pages deploy workflow isn't a file you committed — it's generated
    // by GitHub — so its API path has to be looked up by name rather than
    // guessed. Cache the resolved workflow ID separately (it never changes)
    // to avoid this extra call on every visit.
    let workflowId = sessionStorage.getItem("pagesWorkflowId");

    if (!workflowId) {
      const workflowsRes = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows`,
        { signal: controller.signal, headers: GH_API_HEADERS }
      );

      if (workflowsRes.status === 403) throw new Error("rate-limited");
      if (!workflowsRes.ok) throw new Error(`workflows lookup failed (${workflowsRes.status})`);

      const workflowsData = await workflowsRes.json();
      const pagesWorkflow = workflowsData.workflows?.find(w =>
        /pages.?build.?and.?deployment/i.test(w.name) ||
        /pages-build-deployment/i.test(w.path)
      );

      if (!pagesWorkflow) throw new Error("no Pages workflow found on this repo yet");

      workflowId = pagesWorkflow.id;
      sessionStorage.setItem("pagesWorkflowId", workflowId);
    }

    const runsRes = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/${workflowId}/runs?per_page=1&status=success`,
      { signal: controller.signal, headers: GH_API_HEADERS }
    );

    if (runsRes.status === 403) throw new Error("rate-limited");
    if (!runsRes.ok) throw new Error(`runs lookup failed (${runsRes.status})`);

    const runsData = await runsRes.json();
    const run = runsData.workflow_runs?.[0];
    const text = run ? formatDeployText(run.updated_at) : "🕒 Last deployed: not available";

    el.textContent = text;
    writeCache("deployTimeCache", text);
  } catch (err) {
    if (err.name === "AbortError") {
      el.textContent = "🕒 Last deployed: timed out";
    } else if (err.message === "rate-limited") {
      el.textContent = "🕒 Last deployed: rate-limited, try later";
    } else {
      console.warn("Deploy-time fetch failed:", err.message);
      el.textContent = "🕒 Last deployed: unavailable";
    }
  } finally {
    clearTimeout(timeout);
  }
}

fetchLastDeployTime();

// Star count: replaces the old iframe-based GitHub button. A cross-origin
// iframe is a whole separate browsing context just to show a number — this
// gets the same info with one small fetch instead, same caching pattern as
// the deploy-time check above.
async function fetchStarCount() {
  const el = document.getElementById("star-count");
  if (!el) return;

  const cachedCount = readCache("starCountCache", 5 * 60 * 1000);
  if (cachedCount !== null) {
    el.textContent = cachedCount;
    return;
  }

  try {
    const res = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`,
      { headers: GH_API_HEADERS }
    );

    if (!res.ok) throw new Error(`GitHub API responded with ${res.status}`);

    const data = await res.json();
    const count = typeof data.stargazers_count === "number" ? data.stargazers_count : "—";

    el.textContent = count;
    writeCache("starCountCache", count);
  } catch (err) {
    console.warn("Star count fetch failed:", err.message);
  }
}

fetchStarCount();
