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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(
      "https://api.github.com/repos/Pizzafliper030/SwitchToLinuxSchProject/actions/workflows/pages%2Fpages-build-deployment/runs?per_page=1&status=success",
      {
        signal: controller.signal,
        headers: {
          "Accept": "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28"
        }
      }
    );

    if (!res.ok) throw new Error(`GitHub API responded with ${res.status}`);

    const data = await res.json();
    const run = data.workflow_runs?.[0];
    const text = run ? formatDeployText(run.updated_at) : "🕒 Last deployed: not available";

    el.textContent = text;
    sessionStorage.setItem(DEPLOY_CACHE_KEY, JSON.stringify({ text, savedAt: Date.now() }));
  } catch (err) {
    el.textContent = err.name === "AbortError"
      ? "🕒 Last deployed: timed out"
      : "🕒 Last deployed: error";
  } finally {
    clearTimeout(timeout);
  }
}

fetchLastDeployTime();
