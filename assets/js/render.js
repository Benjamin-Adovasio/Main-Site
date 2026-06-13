import { ICONS } from './icons.js';

export async function loadDirectory() {
  const res = await fetch('/assets/data/directory.json');
  return res.json();
}

export function renderAll(data) {
  let total = 0;

  Object.entries(data).forEach(([section, list]) => {
    const root = document.getElementById(`grid-${section}`);
    if (!root) return;

    root.innerHTML = '';
    list.forEach(s => {
      total++;
      root.appendChild(card(s));
    });
  });

  document.getElementById('count').textContent = total;
}

function card(entry) {
  const a = document.createElement('a');
  a.className = 'card';
  a.href = entry.url;
  a.target = '_blank';
  a.rel = 'noopener';

  a.innerHTML = `
    <strong>${entry.name}</strong>
    <p class="muted">${entry.desc || ''}</p>
  `;
  return a;
}
