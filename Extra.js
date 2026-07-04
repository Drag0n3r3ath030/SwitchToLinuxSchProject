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

// Last-deployed status, with a short cache so repeat visits within the
// same tab session don't re-hit the GitHub API on every page load
const DEPLOY_CACHE_KEY = "deployTimeCache";
const DEPLOY_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

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

  const cached = sessionStorage.getItem(DEPLOY_CACHE_KEY);
  if (cached) {
    const { text, savedAt } = JSON.parse(cached);
    if (Date.now() - savedAt < DEPLOY_CACHE_TTL_MS) {
      el.textContent = text;
      return;
    }
  }

  const owner = "Pizzafliper030";
  const repo = "SwitchToLinuxSchProject";
  const apiHeaders = {
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };

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
        `https://api.github.com/repos/${owner}/${repo}/actions/workflows`,
        { signal: controller.signal, headers: apiHeaders }
      );

      if (workflowsRes.status === 403) {
        throw new Error("rate-limited");
      }
      if (!workflowsRes.ok) {
        throw new Error(`workflows lookup failed (${workflowsRes.status})`);
      }

      const workflowsData = await workflowsRes.json();
      const pagesWorkflow = workflowsData.workflows?.find(w =>
        /pages.?build.?and.?deployment/i.test(w.name) ||
        /pages-build-deployment/i.test(w.path)
      );

      if (!pagesWorkflow) {
        throw new Error("no Pages workflow found on this repo yet");
      }

      workflowId = pagesWorkflow.id;
      sessionStorage.setItem("pagesWorkflowId", workflowId);
    }

    const runsRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/runs?per_page=1&status=success`,
      { signal: controller.signal, headers: apiHeaders }
    );

    if (runsRes.status === 403) {
      throw new Error("rate-limited");
    }
    if (!runsRes.ok) {
      throw new Error(`runs lookup failed (${runsRes.status})`);
    }

    const runsData = await runsRes.json();
    const run = runsData.workflow_runs?.[0];
    const text = run ? formatDeployText(run.updated_at) : "🕒 Last deployed: not available";

    el.textContent = text;
    sessionStorage.setItem(DEPLOY_CACHE_KEY, JSON.stringify({ text, savedAt: Date.now() }));
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
