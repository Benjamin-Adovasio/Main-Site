import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const mainRoot = path.resolve(testDirectory, "..");
const workspaceRoot = path.resolve(mainRoot, "..");
const headInclude = '<!--#include virtual="/_adovasio-shared/footer/head.html" -->';
const footerInclude = '<!--#include virtual="/_adovasio-shared/footer/footer.html" -->';

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function read(root, relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function count(source, token) {
  return source.split(token).length - 1;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function verifyConsumerPage(root, relativePath) {
  const source = read(root, relativePath);
  assert(count(source, headInclude) === 1, `${relativePath} must contain one canonical head SSI include.`);
  assert(count(source, footerInclude) === 1, `${relativePath} must contain one canonical footer SSI include.`);
  assert(source.indexOf(headInclude) < source.indexOf("</head>"), `${relativePath} head include must be inside <head>.`);
  assert(source.indexOf(footerInclude) > source.indexOf("</main>"), `${relativePath} footer include must follow </main>.`);
  assert(!/<footer\b/i.test(source), `${relativePath} must not keep copied footer markup.`);
  assert(!/<iframe\b/i.test(source), `${relativePath} must not embed the footer in an iframe.`);
}

const primaryMainPages = [
  "index.html",
  "about.html",
  "bengpt.html",
  "business.html",
  "residential.html",
  "portfolio.html",
  "contact.html"
];

primaryMainPages.forEach(page => {
  verifyConsumerPage(mainRoot, page);
  const source = read(mainRoot, page);
  assert(source.includes('/assets/css/experience.css?v=16'), `${page} must cache-bust the refactored site CSS.`);
  assert(source.includes('/assets/js/projects.js?v=14'), `${page} must cache-bust the refactored project runtime.`);
  assert(source.includes('class="nav-projects" href="/portfolio.html"'), `${page} must expose the emphasized Projects navigation link.`);
  assert(!source.includes('>Portfolio</a>'), `${page} must use the Projects label in public navigation.`);
});

verifyConsumerPage(mainRoot, "time.html");
assert(read(mainRoot, "time.html").includes('href="/time.css?v=3"'), "Main-Site Time must cache-bust its footer-aware layout CSS.");
const mainPages = [...primaryMainPages, "time.html"];

const head = read(mainRoot, "shared/footer/head.html");
const footer = read(mainRoot, "shared/footer/footer.html");
const footerCss = read(mainRoot, "shared/footer/footer.css");
const footerScript = read(mainRoot, "shared/footer/footer.js");
const apache = read(mainRoot, "apache/adovasio-shared-footer.conf");
const projectPayload = JSON.parse(read(mainRoot, "assets/data/projects.json"));
const technologyPayload = JSON.parse(read(mainRoot, "assets/data/technologies.json"));

const homeProjects = projectPayload.projects
  .filter(project => finitePlacement(project, "home"))
  .sort((a, b) => Number(a.placements.home) - Number(b.placements.home));
assert(
  JSON.stringify(homeProjects.map(project => project.id))
    === JSON.stringify(["sift", "billlens", "file-converter"]),
  "The homepage must feature Sift, BillLens, and File Converter in that order."
);
const inProgressHomeProjects = homeProjects.filter(
  project => String(project.status).toLowerCase() === "in progress"
);
assert(
  JSON.stringify(inProgressHomeProjects.map(project => project.id)) === JSON.stringify(["sift", "billlens"]),
  "Only Sift and BillLens should remain in progress on the homepage."
);
const fileConverter = homeProjects.find(project => project.id === "file-converter");
assert(
  fileConverter?.status === "live"
    && fileConverter.domain === "convert.adovasio.com"
    && fileConverter.url === "https://convert.adovasio.com",
  "File Converter must be live at convert.adovasio.com."
);
assert(
  read(mainRoot, "index.html").includes("Featured work")
    && read(mainRoot, "index.html").includes("Current projects."),
  "The homepage must use a status-neutral heading for its mixed project reel."
);
assert(
  read(mainRoot, "portfolio.html").includes("<title>Projects | Adovasio Technology LLC</title>"),
  "The project directory must use the Projects name."
);

assert(head.includes('href="/_adovasio-shared/footer/footer.css"'), "Canonical head must load canonical footer CSS.");
assert(head.includes('src="/_adovasio-shared/footer/footer.js"'), "Canonical head must load canonical footer runtime.");
assert(!/https?:\/\//.test(head), "Canonical head assets must remain same-origin through the Apache alias.");

assert(count(footer, "<footer") === 1 && count(footer, "</footer>") === 1, "Canonical fragment must contain one footer landmark.");
assert(footer.includes("data-shared-footer"), "Canonical footer must expose its isolation hook.");
assert(footer.includes('src="/_adovasio-shared/assets/images/adovasio-footer-mark-96.webp"'), "Canonical footer must use the canonical mark alias.");
assert(footer.includes('href="https://adovasio.com/"'), "Canonical brand link must target adovasio.com.");
assert(footer.includes('href="mailto:info@adovasio.com"'), "Canonical footer email is missing.");
assert(footer.includes("Technology that just works."), "Canonical footer closing line is missing.");
assert(count(footer, "<nav") === 4, "Canonical footer must retain four navigation landmarks.");
assert(count(footer, 'rel="noopener noreferrer"') >= 11, "Canonical external links must retain safe rel attributes.");

const requiredHeadings = ["Explore", "Tools &amp; Platforms", "iOS Apps", "Systems &amp; Infrastructure"];
requiredHeadings.forEach(heading => {
  assert(footer.includes(`>${heading}</h2>`), `Canonical footer is missing the ${heading} heading.`);
});

function finitePlacement(project, placement) {
  return Number.isFinite(Number(project.placements?.[placement]));
}

function groupFor(project) {
  if (finitePlacement(project, "footer-client")) {
    return "client";
  }
  if (String(project.kind).toLowerCase() === "app" || project.technologies?.includes("ios")) {
    return "ios";
  }
  if (String(project.category).toLowerCase() === "tools" || String(project.audience).toLowerCase() === "public") {
    return "tools";
  }
  return "systems";
}

function compareGroup(a, b, group) {
  const placement = `footer-${group}`;
  const aPlaced = finitePlacement(a, placement);
  const bPlaced = finitePlacement(b, placement);
  if (aPlaced || bPlaced) {
    if (!aPlaced) return 1;
    if (!bPlaced) return -1;
    const difference = Number(a.placements[placement]) - Number(b.placements[placement]);
    if (difference) return difference;
  }
  return Number(a.order) - Number(b.order) || String(a.name).localeCompare(String(b.name));
}

for (const group of ["tools", "ios", "systems"]) {
  const expected = projectPayload.projects
    .filter(project => groupFor(project) === group)
    .sort((a, b) => compareGroup(a, b, group));
  const groupStart = footer.indexOf(`data-footer-project-group="${group}"`);
  const groupEnd = footer.indexOf("</nav>", groupStart);
  assert(groupStart >= 0 && groupEnd > groupStart, `Canonical footer is missing the ${group} project group.`);
  const groupMarkup = footer.slice(groupStart, groupEnd);
  const staticLinks = [...groupMarkup.matchAll(
    /<a href="([^"]+)"[^>]*>\s*<span class="mega-footer__project-name">\s*<span>([^<]+)<\/span>/g
  )].map(([, url, name]) => ({ url, name }));
  const expectedLinks = expected.map(project => ({
    url: escapeHtml(
      project.url
        || `https://adovasio.com/portfolio.html#project-${encodeURIComponent(project.slug)}`
    ),
    name: escapeHtml(project.footerLabel || project.name)
  }));
  assert(
    JSON.stringify(staticLinks) === JSON.stringify(expectedLinks),
    `The ${group} static fallback must exactly match canonical project data without missing, reordered, or stale links.`
  );
}

assert(
  footer.includes("<h3>Free Tools</h3>")
    && footer.includes("Dedicated apps plus utilities built into tools.adovasio.com.")
    && footer.includes("<h3>Other Platforms</h3>"),
  "The footer must distinguish the Free Tools family from other platforms."
);
for (const domain of ["tools.adovasio.com", "convert.adovasio.com", "pdf.adovasio.com"]) {
  assert(
    footer.includes(`<span class="mega-footer__project-detail">${domain}</span>`),
    `The Free Tools footer group must identify ${domain}.`
  );
}

for (const project of inProgressHomeProjects) {
  const destination = `https://adovasio.com/portfolio.html#project-${encodeURIComponent(project.slug)}`;
  assert(
    footer.includes(`href="${destination}"`) && footer.includes(`<span>${escapeHtml(project.name)}</span><small>in progress</small>`),
    `The footer must expose ${project.name} as an in-progress project-directory link.`
  );
}

const expectedClient = projectPayload.projects
  .filter(project => (
    String(project.status || "live").toLowerCase() === "live"
    && String(project.audience).toLowerCase() === "client"
    && finitePlacement(project, "footer-client")
  ))
  .sort((a, b) => compareGroup(a, b, "client"))[0];
const clientMatch = footer.match(/data-footer-client[\s\S]*?<\/div>/);
assert(expectedClient && clientMatch, "Canonical client fallback is missing.");
assert(count(clientMatch[0], "<a") === 1, "Canonical client fallback must contain exactly one link.");
assert(
  clientMatch[0].includes(`href="${escapeHtml(expectedClient.url)}"`),
  "Canonical client fallback URL does not match canonical project data."
);
assert(
  clientMatch[0].includes(`<span>${escapeHtml(expectedClient.action || expectedClient.name)}</span>`),
  "Canonical client fallback action does not match canonical project data."
);

assert(footerCss.includes('url("/_adovasio-shared/footer/manrope-latin-400-800.woff2")'), "Footer font must come from the canonical alias.");
assert(footerCss.includes("[data-shared-footer].site-footer"), "Footer CSS must remain scoped.");
assert(!footerCss.includes(":root"), "Footer CSS must not define global root variables.");
assert(footerCss.includes("@media (max-width: 1180px)"), "Footer CSS is missing the desktop collapse breakpoint.");
assert(footerCss.includes("@media (max-width: 900px)"), "Footer CSS is missing the tablet breakpoint.");
assert(footerCss.includes("@media (max-width: 640px)"), "Footer CSS is missing the mobile breakpoint.");
assert(footerCss.includes("@media (prefers-reduced-motion: reduce)"), "Footer CSS is missing reduced-motion behavior.");
assert(footerCss.includes("text-decoration-line: underline"), "Footer email underline must survive consumer anchor resets.");

assert(footerScript.includes('const PROJECTS_URL = "/_adovasio-shared/assets/data/projects.json"'), "Footer runtime must read canonical project data through the alias.");
assert(footerScript.includes('const TECHNOLOGIES_URL = "/_adovasio-shared/assets/data/technologies.json"'), "Footer runtime must read canonical technology data through the alias.");
assert(footerScript.includes('querySelectorAll("[data-shared-footer]")'), "Footer runtime must be isolated to canonical footer roots.");
assert(!footerScript.includes("data-projects-surface"), "Footer runtime must not activate Main-Site project surfaces.");

function makeSurface(dataset = {}) {
  const attributes = new Map();
  return {
    attributes,
    dataset,
    innerHTML: "",
    setAttribute(name, value) {
      attributes.set(name, String(value));
    }
  };
}

const clientSurface = makeSurface();
const toolSurface = makeSurface({ footerProjectGroup: "tools" });
const iosSurface = makeSurface({ footerProjectGroup: "ios" });
const systemSurface = makeSurface({ footerProjectGroup: "systems" });
const currentYear = { textContent: "" };
const revealClasses = new Set();
const reveal = { classList: { add(value) { revealClasses.add(value); } } };
const businessAttributes = new Map();
const businessLink = {
  removeAttribute(name) { businessAttributes.delete(name); },
  setAttribute(name, value) { businessAttributes.set(name, value); }
};
const otherPageLink = { removeAttribute() {} };
const footerAttributes = new Map();
const footerRoot = {
  setAttribute(name, value) { footerAttributes.set(name, String(value)); },
  querySelector(selector) {
    if (selector === "[data-footer-client]") return clientSurface;
    if (selector === '[data-footer-page="business"]') return businessLink;
    return null;
  },
  querySelectorAll(selector) {
    if (selector === "[data-current-year]") return [currentYear];
    if (selector === "[data-footer-page]") return [businessLink, otherPageLink];
    if (selector === "[data-reveal]") return [reveal];
    if (selector === "[data-footer-project-group]") return [toolSurface, iosSurface, systemSurface];
    return [];
  }
};
const fetchCalls = [];
const runtimeContext = {
  URL,
  console,
  document: {
    body: { dataset: { page: "business" } },
    readyState: "complete",
    querySelectorAll(selector) {
      return selector === "[data-shared-footer]" ? [footerRoot] : [];
    }
  },
  fetch: async (url, options) => {
    fetchCalls.push({ url, options });
    return {
      ok: true,
      json: async () => url === "/_adovasio-shared/assets/data/projects.json"
        ? projectPayload
        : technologyPayload
    };
  },
  window: {
    CSS: { escape: value => value },
    location: { hostname: "adovasio.com", pathname: "/business.html" }
  }
};

vm.runInNewContext(footerScript, runtimeContext, { filename: "shared/footer/footer.js" });
await new Promise(resolve => setImmediate(resolve));
await new Promise(resolve => setImmediate(resolve));

assert(fetchCalls.length === 2, "Footer runtime must request both canonical data files once.");
assert(fetchCalls.map(call => call.url).includes("/_adovasio-shared/assets/data/projects.json"), "Footer runtime fetched a noncanonical project-data URL.");
assert(fetchCalls.map(call => call.url).includes("/_adovasio-shared/assets/data/technologies.json"), "Footer runtime fetched a noncanonical technology-data URL.");
assert(fetchCalls.every(call => call.options?.cache === "no-store"), "Footer runtime must bypass stale footer-data cache entries.");
assert(clientSurface.innerHTML.includes("https://sso.adovasio.com") && clientSurface.innerHTML.includes("Client Login"), "Footer runtime did not render canonical client access.");
assert(toolSurface.innerHTML.includes("Free Tools") && toolSurface.innerHTML.includes("Stratum 2 NTP Server"), "Footer runtime did not render the canonical tools group.");
assert(toolSurface.innerHTML.includes("Network &amp; Server Tools") && toolSurface.innerHTML.includes("Dedicated apps plus utilities built into tools.adovasio.com."), "Footer runtime did not explain the built-in Free Tools utilities.");
assert(toolSurface.innerHTML.includes("https://convert.adovasio.com/") && toolSurface.innerHTML.includes("convert.adovasio.com"), "Footer runtime did not link the live File Converter.");
assert(toolSurface.innerHTML.includes("https://pdf.adovasio.com/") && toolSurface.innerHTML.includes("pdf.adovasio.com"), "Footer runtime did not group PDF Tools under Free Tools.");
assert(iosSurface.innerHTML.includes("Georgie AI") && iosSurface.innerHTML.includes("Guardian Campus Safety"), "Footer runtime did not render the canonical iOS group.");
assert(iosSurface.innerHTML.includes("Sift") && iosSurface.innerHTML.includes("BillLens"), "Footer runtime omitted in-progress iOS projects.");
assert(toolSurface.innerHTML.includes("File Converter"), "Footer runtime omitted the live File Converter.");
assert(iosSurface.innerHTML.includes("<small>in progress</small>") && !toolSurface.innerHTML.includes("<small>in progress</small>"), "Footer runtime must limit in-progress labels to unfinished projects.");
assert(!iosSurface.innerHTML.match(/project-(?:sift|billlens)" target="_blank"/) && !toolSurface.innerHTML.match(/project-file-converter" target="_blank"/), "Footer runtime treated project-directory links as new-tab destinations.");
assert(systemSurface.innerHTML.includes("Adovasio VPN") && systemSurface.innerHTML.includes("Index Portal"), "Footer runtime did not render the canonical systems group.");
assert([clientSurface, toolSurface, iosSurface, systemSurface].every(surface => surface.attributes.get("aria-busy") === "false"), "Footer runtime did not clear busy state.");
assert(currentYear.textContent === String(new Date().getFullYear()), "Footer runtime did not update the copyright year.");
assert(revealClasses.has("is-visible"), "Footer runtime did not reveal canonical content.");
assert(businessAttributes.get("aria-current") === "page", "Footer runtime did not mark the current Main-Site page.");
assert(footerAttributes.has("data-canonical-host"), "Footer runtime did not identify the canonical host.");

for (const token of [
  "ADOVASIO_MAIN_ROOT",
  "ADOVASIO_INDEX_ROOT",
  "ADOVASIO_SOC_ROOT",
  "ADOVASIO_TIME_ROOT",
  "ADOVASIO_TOOLS_ROOT",
  "ADOVASIO_CONNECT_ROOT",
  'Alias "/_adovasio-shared/footer/"',
  'Alias "/_adovasio-shared/assets/"',
  "Options +IncludesNOEXEC",
  "AddOutputFilter INCLUDES .html",
  "SSIETag Off",
  "SSILastModified Off",
  'Cache-Control "no-cache, must-revalidate"'
]) {
  assert(apache.includes(token), `Apache shared-footer config is missing: ${token}`);
}

for (const relativePath of [
  "shared/footer/manrope-latin-400-800.woff2",
  "assets/images/adovasio-footer-mark-96.webp"
]) {
  assert(fs.existsSync(path.join(mainRoot, relativePath)), `Canonical asset is missing: ${relativePath}`);
}

const siblingContracts = [
  { directory: "Index", pages: ["index.html"] },
  { directory: "SOC-Dashboard", pages: ["index.html"] },
  { directory: "time-server", pages: ["index.html"] },
  { directory: "webtools", pages: ["index.html", "ip.html", "dns.html", "ping.html", "http.html", "port.html"] },
  { directory: "VPN-Portal-Website", pages: ["public/index.html", "public/setup/index.html", "public/help/index.html"] }
];

const siblingsPresent = siblingContracts.every(contract => fs.existsSync(path.join(workspaceRoot, contract.directory)));
if (siblingsPresent) {
  siblingContracts.forEach(contract => {
    const root = path.join(workspaceRoot, contract.directory);
    contract.pages.forEach(page => verifyConsumerPage(root, page));
  });
  assert(
    read(path.join(workspaceRoot, "time-server"), "index.html").includes('href="/time.css?v=2"'),
    "Time must cache-bust the layout stylesheet that makes room for the shared footer."
  );

  const forbiddenWebtoolsCopies = [
    "assets/css/footer.css",
    "assets/js/footer.js",
    "assets/data/footer/projects.json",
    "assets/data/footer/technologies.json",
    "assets/images/footer/adovasio-footer-mark-96.webp",
    "assets/fonts/manrope-latin-400-800.woff2"
  ];
  forbiddenWebtoolsCopies.forEach(relativePath => {
    assert(!fs.existsSync(path.join(workspaceRoot, "webtools", relativePath)), `Webtools still contains a footer copy: ${relativePath}`);
  });
}

console.log(`Verified the canonical footer, ${mainPages.length} Main-Site pages${siblingsPresent ? ", and all 12 consumer pages" : ""}.`);
