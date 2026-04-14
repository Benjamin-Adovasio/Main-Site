const ICONS = {
  shield: `<svg viewBox="0 0 24 24"><path d="M12 2l8 4v6c0 5-3.5 9.5-8 12-4.5-2.5-8-7-8-12V6z"></path></svg>`,
  cloud: `<svg viewBox="0 0 24 24"><path d="M6 18h11a4 4 0 0 0 0-8 5 5 0 0 0-9.7-1A4 4 0 0 0 6 18z"></path></svg>`,
  printer: `<svg viewBox="0 0 24 24"><path d="M6 9V3h12v6"></path><rect x="6" y="14" width="12" height="7"></rect><rect x="4" y="9" width="16" height="5"></rect></svg>`,
  key: `<svg viewBox="0 0 24 24"><circle cx="7" cy="15" r="3"></circle><path d="M10 15h11l-2-2 2-2"></path></svg>`,
  camera: `<svg viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l2-3h6l2 3h3a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>`,
  clock: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>`,
  notes: `<svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="2"></rect><line x1="8" y1="7" x2="16" y2="7"></line><line x1="8" y1="11" x2="16" y2="11"></line><line x1="8" y1="15" x2="13" y2="15"></line></svg>`,
  energy: `<svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 10 10 13 2"></polygon></svg>`,
  cable: `<svg viewBox="0 0 24 24"><path d="M8 8v6a4 4 0 0 0 4 4h4"></path><path d="M5 5h3v3H5z"></path><path d="M16 15h3v4h-3z"></path></svg>`,
  device: `<svg viewBox="0 0 24 24"><rect x="7" y="2" width="10" height="20" rx="2"></rect><line x1="11" y1="18" x2="13" y2="18"></line></svg>`,
  network: `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="6" height="6" rx="1"></rect><rect x="15" y="3" width="6" height="6" rx="1"></rect><rect x="9" y="15" width="6" height="6" rx="1"></rect><path d="M9 6h6"></path><path d="M12 9v6"></path></svg>`
};

const SERVICE_META = {
  shield: { label: "Access", accent: "80 167 255" },
  key: { label: "Identity", accent: "124 220 255" },
  cloud: { label: "Hosting", accent: "59 152 255" },
  printer: { label: "Print", accent: "41 192 229" },
  camera: { label: "Media", accent: "124 220 255" },
  clock: { label: "Utility", accent: "151 229 255" },
  notes: { label: "Workspace", accent: "110 209 255" },
  energy: { label: "Monitoring", accent: "43 196 164" },
  cable: { label: "Infrastructure", accent: "38 191 233" },
  device: { label: "Apps", accent: "84 149 255" },
  network: { label: "Deployment", accent: "59 152 255" }
};

const GROUP_META = {
  websites: {
    rootId: "grid-websites",
    kind: "Hosted Site",
    emptyTitle: "Hosted sites unavailable",
    emptyDescription: "The hosted properties list could not be loaded right now."
  },
  serviceLines: {
    rootId: "grid-service-lines",
    kind: "Service Line",
    emptyTitle: "Service lines unavailable",
    emptyDescription: "The Adovasio service pages could not be loaded right now."
  },
  apps: {
    rootId: "grid-apps",
    kind: "Published App",
    emptyTitle: "Apps unavailable",
    emptyDescription: "The published apps list could not be loaded right now."
  }
};

const directoryState = {
  query: "",
  filter: "all"
};

document.addEventListener("DOMContentLoaded", () => {
  setupDirectoryControls();
  loadDirectory();
});

async function loadDirectory() {
  try {
    const response = await fetch("/assets/data/services.json", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("directory-data");
    }

    const data = await response.json();
    const websites = Array.isArray(data.websites) ? data.websites : [];
    const serviceLines = Array.isArray(data.serviceLines) ? data.serviceLines : [];
    const apps = Array.isArray(data.apps) ? data.apps : [];

    updateCounts({
      websites: websites.length,
      serviceLines: serviceLines.length,
      apps: apps.length
    });

    renderFeaturedLinks(websites);
    renderDirectoryGroup("websites", websites);
    renderDirectoryGroup("serviceLines", serviceLines);
    renderDirectoryGroup("apps", apps);
    applyDirectoryFilters();
    refreshMotion();
  } catch (error) {
    updateCounts({
      websites: 0,
      serviceLines: 0,
      apps: 0
    });

    renderFeaturedLinks([]);
    renderDirectoryGroup("websites", []);
    renderDirectoryGroup("serviceLines", []);
    renderDirectoryGroup("apps", []);
    applyDirectoryFilters();
    refreshMotion();
  }
}

function setupDirectoryControls() {
  const search = document.getElementById("directory-search");
  const filterButtons = document.querySelectorAll("[data-directory-filter]");

  if (search) {
    search.addEventListener("input", event => {
      directoryState.query = String(event.target.value || "").trim().toLowerCase();
      applyDirectoryFilters();
    });
  }

  filterButtons.forEach(button => {
    button.addEventListener("click", () => {
      directoryState.filter = button.dataset.directoryFilter || "all";

      filterButtons.forEach(node => {
        const isActive = node === button;
        node.classList.toggle("is-active", isActive);
        node.setAttribute("aria-pressed", String(isActive));
      });

      applyDirectoryFilters();
    });
  });
}

function updateCounts(counts) {
  setText("[data-website-count]", counts.websites);
  setText("[data-service-count]", counts.serviceLines);
  setText("[data-app-count]", counts.apps);
}

function renderFeaturedLinks(websites) {
  const root = document.getElementById("featured-links");
  if (!root) {
    return;
  }

  const featured = websites.slice(0, 4);

  if (featured.length === 0) {
    root.innerHTML = `
      <article class="state-card" data-animate>
        <p class="panel-label">Unavailable</p>
        <h3>Featured links could not be loaded.</h3>
        <p>Refresh the page to try again.</p>
      </article>
    `;
    return;
  }

  root.innerHTML = featured
    .map((entry, index) => {
      const host = formatHost(entry.url);
      return `
        <a
          class="featured-link"
          href="${escapeAttribute(entry.url)}"
          target="_blank"
          rel="noopener noreferrer"
          data-animate
          style="--card-delay: ${index * 55}ms"
        >
          <strong>${escapeHtml(entry.name)}</strong>
          <span>${escapeHtml(host)}</span>
        </a>
      `;
    })
    .join("");
}

function renderDirectoryGroup(groupKey, entries) {
  const meta = GROUP_META[groupKey];
  const root = document.getElementById(meta.rootId);

  if (!root) {
    return;
  }

  if (entries.length === 0) {
    root.innerHTML = `
      <article class="state-card" data-animate>
        <p class="panel-label">Unavailable</p>
        <h3>${escapeHtml(meta.emptyTitle)}</h3>
        <p>${escapeHtml(meta.emptyDescription)}</p>
      </article>
    `;
    return;
  }

  root.innerHTML = entries
    .map((entry, index) => renderDirectoryCard(entry, groupKey, index))
    .join("");
}

function renderDirectoryCard(entry, groupKey, index) {
  const serviceMeta = resolveServiceMeta(entry);
  const icon = ICONS[entry.icon] || ICONS.cloud;
  const href = escapeAttribute(entry.url);
  const footer = resolveFooter(entry);
  const action = resolveAction(entry);
  const searchText = buildSearchText(entry, groupKey, serviceMeta);

  return `
    <a
      class="directory-card"
      href="${href}"
      ${buildLinkAttributes(entry.url)}
      data-directory-card
      data-group="${escapeAttribute(groupKey)}"
      data-search="${escapeAttribute(searchText)}"
      data-animate
      style="--card-accent: ${serviceMeta.accent}; --card-delay: ${index * 65}ms"
    >
      <div class="card-top">
        <span class="card-kind">${escapeHtml(GROUP_META[groupKey].kind)}</span>
        <span class="card-tag">${escapeHtml(entry.label || serviceMeta.label)}</span>
      </div>
      <div class="card-icon">
        ${icon}
      </div>
      <h3>${escapeHtml(entry.name)}</h3>
      <p>${escapeHtml(entry.desc || "")}</p>
      <div class="card-footer">
        <span>${escapeHtml(footer)}</span>
        <strong>${escapeHtml(action)}</strong>
      </div>
    </a>
  `;
}

function applyDirectoryFilters() {
  const cards = Array.from(document.querySelectorAll("[data-directory-card]"));
  const sections = Array.from(document.querySelectorAll("[data-directory-section]"));
  const emptyState = document.getElementById("directory-empty");
  let visibleCount = 0;

  cards.forEach(card => {
    const matchesFilter =
      directoryState.filter === "all" || card.dataset.group === directoryState.filter;
    const haystack = String(card.dataset.search || "");
    const matchesQuery =
      directoryState.query.length === 0 || haystack.includes(directoryState.query);
    const visible = matchesFilter && matchesQuery;

    card.hidden = !visible;

    if (visible) {
      visibleCount += 1;
    }
  });

  sections.forEach(section => {
    const sectionCards = section.querySelectorAll("[data-directory-card]");
    if (sectionCards.length === 0) {
      section.hidden = false;
      return;
    }

    const hasVisibleCard = Array.from(sectionCards).some(card => !card.hidden);
    section.hidden = !hasVisibleCard;
  });

  if (emptyState) {
    emptyState.hidden = cards.length === 0 || visibleCount > 0;
  }

  setText("[data-results-count]", visibleCount);
}

function buildSearchText(entry, groupKey, meta) {
  return [
    GROUP_META[groupKey].kind,
    entry.name,
    entry.desc,
    entry.label,
    meta.label,
    entry.footer,
    entry.url,
    resolveFooter(entry)
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function resolveServiceMeta(entry) {
  return SERVICE_META[entry.icon] || SERVICE_META.cloud;
}

function resolveFooter(entry) {
  if (entry.footer) {
    return entry.footer;
  }

  if (entry.url) {
    return formatHost(entry.url);
  }

  return "Adovasio entry";
}

function resolveAction(entry) {
  if (entry.action) {
    return entry.action;
  }

  return isExternalUrl(entry.url) ? "Open" : "Learn more";
}

function buildLinkAttributes(url) {
  return isExternalUrl(url) ? 'target="_blank" rel="noopener noreferrer"' : "";
}

function isExternalUrl(url) {
  return /^https?:\/\//i.test(String(url));
}

function formatHost(value) {
  try {
    return new URL(value).host;
  } catch (error) {
    return String(value).replace(/^https?:\/\//, "");
  }
}

function setText(selector, value) {
  document.querySelectorAll(selector).forEach(node => {
    node.textContent = String(value);
  });
}

function refreshMotion() {
  window.AdovasioMotion?.refresh?.(document.body);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
