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

const ENTRY_META = {
  shield: { label: "Access" },
  key: { label: "Identity" },
  cloud: { label: "Hosting" },
  printer: { label: "Print" },
  camera: { label: "Media" },
  clock: { label: "Utility" },
  notes: { label: "Workspace" },
  energy: { label: "Monitoring" },
  cable: { label: "Infrastructure" },
  device: { label: "Apps" },
  network: { label: "Deployment" }
};

const KIND_META = {
  portal: {
    label: "Portal",
    tag: "portals"
  },
  app: {
    label: "App",
    tag: "apps"
  }
};

const TAG_LABELS = {
  access: "Access",
  "app-store": "App Store",
  apps: "Apps",
  campus: "Campus",
  code: "Code",
  files: "Files",
  hosting: "Hosting",
  identity: "Identity",
  media: "Media",
  monitoring: "Monitoring",
  notes: "Notes",
  photos: "Photos",
  portals: "Portals",
  print: "Print",
  safety: "Safety",
  security: "Security",
  sync: "Sync",
  time: "Time",
  utility: "Utility",
  workspace: "Workspace"
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
    const response = await fetch("/assets/data/directory.json", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("directory-data");
    }

    const data = await response.json();
    const websites = Array.isArray(data.websites) ? data.websites : [];
    const apps = Array.isArray(data.apps) ? data.apps : [];
    const entries = [
      ...websites.map(entry => normalizeDirectoryEntry(entry, "portal")),
      ...apps.map(entry => normalizeDirectoryEntry(entry, "app"))
    ];

    renderTagFilters(entries);
    renderDirectory(entries);
    applyDirectoryFilters();
    refreshMotion();
  } catch (error) {
    renderTagFilters([]);
    renderDirectory([]);
    applyDirectoryFilters();
    refreshMotion();
  }
}

function setupDirectoryControls() {
  const search = document.getElementById("directory-search");
  const tagRoot = document.getElementById("directory-tags");

  if (search) {
    search.addEventListener("input", event => {
      directoryState.query = String(event.target.value || "").trim().toLowerCase();
      applyDirectoryFilters();
    });
  }

  if (tagRoot) {
    tagRoot.addEventListener("click", event => {
      const button = event.target.closest("[data-directory-filter]");
      if (!button) {
        return;
      }

      directoryState.filter = button.dataset.directoryFilter || "all";

      tagRoot.querySelectorAll("[data-directory-filter]").forEach(node => {
        const isActive = node === button;
        node.classList.toggle("is-active", isActive);
        node.setAttribute("aria-pressed", String(isActive));
      });

      applyDirectoryFilters();
    });
  }
}

function renderTagFilters(entries) {
  const root = document.getElementById("directory-tags");
  if (!root) {
    return;
  }

  const tags = Array.from(new Set(entries.flatMap(entry => entry.tags))).sort((left, right) => {
    const priority = ["portals", "apps"];
    const leftPriority = priority.indexOf(left);
    const rightPriority = priority.indexOf(right);

    if (leftPriority !== -1 || rightPriority !== -1) {
      return (leftPriority === -1 ? 99 : leftPriority) - (rightPriority === -1 ? 99 : rightPriority);
    }

    return getTagLabel(left).localeCompare(getTagLabel(right));
  });

  root.innerHTML = [
    renderFilterButton("all", "All", directoryState.filter === "all"),
    ...tags.map(tag => renderFilterButton(tag, getTagLabel(tag), directoryState.filter === tag))
  ].join("");
}

function renderFilterButton(value, label, isActive) {
  return `
    <button
      class="filter-pill${isActive ? " is-active" : ""}"
      type="button"
      data-directory-filter="${escapeAttribute(value)}"
      aria-pressed="${String(isActive)}"
    >
      ${escapeHtml(label)}
    </button>
  `;
}

function renderDirectory(entries) {
  const root = document.getElementById("grid-directory");

  if (!root) {
    return;
  }

  if (entries.length === 0) {
    root.innerHTML = `
      <article class="state-card">
        <p class="panel-label">Unavailable</p>
        <h3>Directory unavailable</h3>
        <p>The Adovasio directory could not be loaded right now.</p>
      </article>
    `;
    return;
  }

  root.innerHTML = entries
    .map(entry => renderDirectoryCard(entry))
    .join("");
}

function renderDirectoryCard(entry) {
  const entryMeta = resolveEntryMeta(entry);
  const icon = resolveIcon(entry.icon);
  const href = escapeAttribute(entry.url);
  const footer = resolveFooter(entry);
  const action = resolveAction(entry);
  const searchText = buildSearchText(entry, entryMeta);
  const featuredTag = entry.tags.find(tag => tag !== entry.kindTag) || entry.kindTag;

  return `
    <a
      class="directory-card"
      href="${href}"
      ${buildLinkAttributes(entry.url)}
      data-directory-card
      data-tags="${escapeAttribute(entry.tags.join("|"))}"
      data-search="${escapeAttribute(searchText)}"
    >
      <div class="card-top">
        <span class="card-kind">${escapeHtml(entry.kindLabel)}</span>
        <span class="card-tag">${escapeHtml(entry.label || getTagLabel(featuredTag) || entryMeta.label)}</span>
      </div>
      <div class="card-body">
        <span class="card-icon" aria-hidden="true">
          ${icon}
        </span>
        <div>
          <h3>${escapeHtml(entry.name)}</h3>
          <p>${escapeHtml(entry.desc || "")}</p>
        </div>
      </div>
      <div class="card-footer">
        <span>${escapeHtml(footer)}</span>
        <strong class="card-action">${escapeHtml(action)}</strong>
      </div>
    </a>
  `;
}

function applyDirectoryFilters() {
  const cards = Array.from(document.querySelectorAll("[data-directory-card]"));
  const emptyState = document.getElementById("directory-empty");
  let visibleCount = 0;

  cards.forEach(card => {
    const tags = String(card.dataset.tags || "").split("|").filter(Boolean);
    const matchesFilter = directoryState.filter === "all" || tags.includes(directoryState.filter);
    const haystack = String(card.dataset.search || "");
    const matchesQuery =
      directoryState.query.length === 0 || haystack.includes(directoryState.query);
    const visible = matchesFilter && matchesQuery;

    card.hidden = !visible;

    if (visible) {
      visibleCount += 1;
    }
  });

  if (emptyState) {
    emptyState.hidden = cards.length === 0 || visibleCount > 0;
  }

  setText("[data-results-count]", visibleCount);
}

function normalizeDirectoryEntry(entry, kind) {
  const kindMeta = KIND_META[kind] || KIND_META.portal;
  const tags = normalizeTags([kindMeta.tag, ...(Array.isArray(entry.tags) ? entry.tags : [])]);

  return {
    ...entry,
    kind,
    kindLabel: kindMeta.label,
    kindTag: kindMeta.tag,
    tags
  };
}

function normalizeTags(tags) {
  return Array.from(
    new Set(
      tags
        .map(tag => String(tag || "").trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

function buildSearchText(entry, meta) {
  return [
    entry.kindLabel,
    entry.name,
    entry.desc,
    entry.label,
    meta.label,
    entry.footer,
    entry.url,
    resolveFooter(entry),
    ...entry.tags.map(getTagLabel)
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function resolveEntryMeta(entry) {
  return ENTRY_META[entry.icon] || ENTRY_META.cloud;
}

function getTagLabel(tag) {
  return TAG_LABELS[tag] || String(tag).replace(/-/g, " ").replace(/\b\w/g, char => char.toUpperCase());
}

function resolveIcon(iconName) {
  const icon = ICONS[iconName] || ICONS.cloud;
  return icon.replace("<svg ", '<svg aria-hidden="true" focusable="false" ');
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
