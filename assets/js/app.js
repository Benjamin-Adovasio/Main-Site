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
  shield: { label: "Access", accent: "37, 99, 235" },
  key: { label: "Identity", accent: "96, 165, 250" },
  cloud: { label: "Hosting", accent: "56, 189, 248" },
  printer: { label: "Print", accent: "14, 165, 233" },
  camera: { label: "Media", accent: "59, 130, 246" },
  clock: { label: "Utility", accent: "147, 197, 253" },
  notes: { label: "Workspace", accent: "125, 211, 252" },
  energy: { label: "Monitoring", accent: "96, 165, 250" },
  cable: { label: "Infrastructure", accent: "59, 130, 246" },
  device: { label: "Apps", accent: "37, 99, 235" },
  network: { label: "Deployment", accent: "14, 165, 233" }
};

document.addEventListener("DOMContentLoaded", () => {
  loadServices();
});

async function loadServices() {
  try {
    const response = await fetch("/assets/data/services.json", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("services");
    }

    const data = await response.json();
    const services = Array.isArray(data.core) ? data.core : [];

    renderServiceCount(services.length);
    renderServiceLaunch(services);
    renderServices(services);
  } catch (error) {
    renderServiceCount(0);
    renderServiceLaunch([]);
    renderServices([]);
  }
}

function renderServiceCount(count) {
  document.querySelectorAll("[data-service-count]").forEach(node => {
    node.textContent = String(count);
  });
}

function renderServiceLaunch(services) {
  const root = document.getElementById("service-launch");
  if (!root) {
    return;
  }

  const linkedServices = services.filter(service => Boolean(service.url)).slice(0, 6);

  if (linkedServices.length === 0) {
    root.innerHTML = `
      <article class="status-card">
        <h3>Directory links unavailable</h3>
        <p>Refresh to try again.</p>
      </article>
    `;
    applyReveal(root, ".status-card");
    return;
  }

  root.innerHTML = linkedServices
    .map((service, index) => {
      const host = formatServiceHost(service.url);
      return `
        <a
          class="service-link"
          href="${escapeAttribute(service.url)}"
          target="_blank"
          rel="noopener noreferrer"
          style="--card-delay: ${index * 55}ms"
        >
          <strong>${escapeHtml(service.name)}</strong>
          <span>${escapeHtml(host)}</span>
        </a>
      `;
    })
    .join("");

  applyReveal(root, ".service-link", 55);
}

function renderServices(services) {
  const root = document.getElementById("grid-core");
  if (!root) {
    return;
  }

  if (services.length === 0) {
    root.innerHTML = `
      <article class="status-card">
        <h3>Directory unavailable</h3>
        <p>The service directory could not be loaded.</p>
      </article>
    `;
    applyReveal(root, ".status-card");
    return;
  }

  root.innerHTML = services
    .map((service, index) => renderServiceCard(service, index))
    .join("");

  applyReveal(root, ".service-card", 70);
}

function renderServiceCard(service, index) {
  const meta = resolveServiceMeta(service);
  const icon = ICONS[service.icon] || ICONS.cloud;
  const hasUrl = Boolean(service.url);
  const cardBody = `
    <div class="card-top">
      <span class="service-kicker">${escapeHtml(meta.label)}</span>
      <div class="service-icon">
        ${icon}
      </div>
    </div>
    <h3>${escapeHtml(service.name)}</h3>
    <p>${escapeHtml(service.desc || "")}</p>
    <div class="service-footer">
      <span class="service-domain">${escapeHtml(resolveServiceFooter(service))}</span>
      <span class="service-arrow">${escapeHtml(resolveServiceAction(service, hasUrl))}</span>
    </div>
  `;
  const style = `--service-accent: ${meta.accent}; --card-delay: ${index * 70}ms`;

  if (!hasUrl) {
    return `
      <article class="card service-card is-static" style="${style}">
        ${cardBody}
      </article>
    `;
  }

  return `
    <a
      class="card service-card"
      href="${escapeAttribute(service.url)}"
      target="_blank"
      rel="noopener noreferrer"
      style="${style}"
    >
      ${cardBody}
    </a>
  `;
}

function resolveServiceMeta(service) {
  const fallback = SERVICE_META[service.icon] || SERVICE_META.cloud;

  return {
    label: service.label || fallback.label,
    accent: service.accent || fallback.accent
  };
}

function resolveServiceFooter(service) {
  if (service.footer) {
    return service.footer;
  }

  if (service.url) {
    return formatServiceHost(service.url);
  }

  return "Adovasio service line";
}

function resolveServiceAction(service, hasUrl) {
  if (service.action) {
    return service.action;
  }

  return hasUrl ? "Open entry" : "Service overview";
}

function applyReveal(root, selector, step = 70) {
  root.querySelectorAll(selector).forEach((element, index) => {
    element.setAttribute("data-animate", "");

    if (!element.style.getPropertyValue("--card-delay")) {
      element.style.setProperty("--card-delay", `${index * step}ms`);
    }
  });

  window.AdovasioMotion?.refresh?.(root);
}

function formatServiceHost(value) {
  try {
    return new URL(value).host;
  } catch (error) {
    return String(value).replace(/^https?:\/\//, "");
  }
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
