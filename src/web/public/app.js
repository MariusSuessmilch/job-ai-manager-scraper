/* KI-Job-Radar — Frontend-Logik (Vanilla JS, GSAP optional via CDN) */
(() => {
  'use strict';

  const G = typeof window.gsap !== 'undefined' ? window.gsap : null;
  const POLL_MS = 5000;

  const STATUS_VALUES = [
    'gefunden', 'geprüft', 'interessant', 'nicht passend', 'vorbereitet',
    'beworben', 'Rückmeldung erhalten', 'erstes Gespräch', 'zweites Gespräch',
    'Absage', 'Angebot', 'zurückgezogen',
  ];

  const BREAKDOWN_SPEC = [
    { key: 'role_fit', label: 'Rollenpassung', max: 25 },
    { key: 'experience_level_fit', label: 'Erfahrungslevel', max: 20 },
    { key: 'cv_match', label: 'CV-Match', max: 25 },
    { key: 'technical_fit', label: 'Technik-Fit', max: 10 },
    { key: 'application_probability', label: 'Bewerbungswahrscheinlichkeit', max: 10 },
    { key: 'location_fit', label: 'Standort', max: 10 },
  ];

  const FUNNEL_STAGES = [
    { label: 'Gefunden', statuses: ['gefunden'] },
    { label: 'Geprüft', statuses: ['geprüft', 'interessant', 'nicht passend'] },
    { label: 'Vorbereitet', statuses: ['vorbereitet'] },
    { label: 'Beworben', statuses: ['beworben', 'Rückmeldung erhalten'] },
    { label: 'Gespräche', statuses: ['erstes Gespräch', 'zweites Gespräch'] },
    { label: 'Angebot', statuses: ['Angebot'] },
    { label: 'Absage / zurückgez.', statuses: ['Absage', 'zurückgezogen'] },
  ];

  const state = {
    jobs: [],
    stats: null,
    sortKey: 'score',
    sortDir: 'desc',
    search: '',
    filterRecommendation: '',
    filterStatus: '',
    expanded: new Set(),
    knownIds: new Set(),
    firstLoad: true,
    lastJobsJson: '',
    lastStatsJson: '',
    counters: { total: 0, scored: 0, bewerben: 0, pruefen: 0, ehernicht: 0, avg: 0 },
  };

  const $ = (id) => document.getElementById(id);
  const tbody = $('jobs-tbody');

  /* ---------- Hilfsfunktionen ---------- */

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  function fmtTime(iso) {
    if (!iso) return '–';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function fmtTimeShort(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '–';
    const today = new Date();
    const sameDay = d.toDateString() === today.toDateString();
    const hm = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    return sameDay ? hm : `${d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} ${hm}`;
  }

  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function scoreClass(score) {
    if (score == null) return 'score-none';
    if (score >= 70) return 'score-high';
    if (score >= 55) return 'score-mid';
    return 'score-low';
  }

  function chipClass(rec) {
    if (rec === 'bewerben') return 'chip-bewerben';
    if (rec === 'prüfen') return 'chip-pruefen';
    if (rec === 'eher nicht bewerben') return 'chip-nein';
    return 'chip-none';
  }

  function animateCounter(el, from, to, opts = {}) {
    if (from === to) { el.textContent = formatCounter(to, opts); return; }
    if (!G) { el.textContent = formatCounter(to, opts); return; }
    const obj = { v: from };
    G.to(obj, {
      v: to,
      duration: 0.8,
      ease: 'power2.out',
      onUpdate: () => { el.textContent = formatCounter(obj.v, opts); },
    });
  }

  function formatCounter(v, opts) {
    return opts.decimals ? v.toFixed(1).replace('.', ',') : String(Math.round(v));
  }

  /* ---------- Mini-Markdown-Renderer ---------- */

  function inlineMd(text) {
    let s = esc(text);
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
      const safe = /^(https?:|mailto:)/i.test(href) ? href : '#';
      return `<a href="${esc(safe)}" target="_blank" rel="noopener">${label}</a>`;
    });
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    return s;
  }

  function renderMarkdown(md) {
    const lines = md.split(/\r?\n/);
    const out = [];
    let inList = false;
    const closeList = () => { if (inList) { out.push('</ul>'); inList = false; } };
    for (const line of lines) {
      const t = line.trim();
      if (t === '') { closeList(); continue; }
      if (/^---+$/.test(t)) { closeList(); out.push('<hr>'); continue; }
      const h = /^(#{1,3})\s+(.*)$/.exec(t);
      if (h) { closeList(); const lvl = h[1].length; out.push(`<h${lvl}>${inlineMd(h[2])}</h${lvl}>`); continue; }
      if (t.startsWith('> ')) { closeList(); out.push(`<blockquote>${inlineMd(t.slice(2))}</blockquote>`); continue; }
      if (/^[-*]\s+/.test(t)) {
        if (!inList) { out.push('<ul>'); inList = true; }
        out.push(`<li>${inlineMd(t.replace(/^[-*]\s+/, ''))}</li>`);
        continue;
      }
      closeList();
      out.push(`<p>${inlineMd(t)}</p>`);
    }
    closeList();
    return out.join('\n');
  }

  /* ---------- KPI / Header ---------- */

  function renderStats() {
    const s = state.stats;
    if (!s) return;
    const rec = s.byRecommendation || {};
    const next = {
      total: s.total || 0,
      scored: s.scored || 0,
      bewerben: rec['bewerben'] || 0,
      pruefen: rec['prüfen'] || 0,
      ehernicht: rec['eher nicht bewerben'] || 0,
      avg: s.avgScore || 0,
    };
    animateCounter($('count-total'), state.counters.total, next.total);
    animateCounter($('count-scored'), state.counters.scored, next.scored);
    animateCounter($('kpi-total'), state.counters.total, next.total);
    animateCounter($('kpi-bewerben'), state.counters.bewerben, next.bewerben);
    animateCounter($('kpi-pruefen'), state.counters.pruefen, next.pruefen);
    animateCounter($('kpi-ehernicht'), state.counters.ehernicht, next.ehernicht);
    if (s.avgScore != null) {
      animateCounter($('kpi-avg'), state.counters.avg, next.avg, { decimals: true });
    } else {
      $('kpi-avg').textContent = '–';
    }
    $('kpi-scrape').textContent = s.lastScrapedAt ? fmtTimeShort(s.lastScrapedAt) : '–';
    $('kpi-scrape-date').textContent = s.lastScrapedAt ? fmtDate(s.lastScrapedAt) : 'noch kein Scrape';
    state.counters = next;
    renderHistogram(s.scoreHistogram || []);
    renderFunnel(s.byStatus || {});
  }

  /* ---------- Histogramm ---------- */

  function renderHistogram(buckets) {
    const host = $('histogram');
    const empty = $('histogram-empty');
    const max = Math.max(...buckets, 0);
    if (max === 0) {
      host.innerHTML = '';
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    const prev = host.dataset.sig;
    const sig = buckets.join(',');
    if (prev === sig) return;
    host.dataset.sig = sig;
    host.innerHTML = buckets.map((count, i) => {
      const pct = max > 0 ? Math.max(2, (count / max) * 100) : 2;
      return `<div class="hist-col" data-bucket="${i}">
        <span class="hist-count">${count > 0 ? count : ''}</span>
        <div class="hist-bar" style="height:${pct}%"></div>
        <span class="hist-label">${i * 10}</span>
      </div>`;
    }).join('');
    if (G) {
      G.from(host.querySelectorAll('.hist-bar'), {
        scaleY: 0, duration: 0.7, ease: 'power3.out', stagger: 0.04,
      });
    }
  }

  /* ---------- Funnel ---------- */

  function renderFunnel(byStatus) {
    const host = $('funnel');
    const counts = FUNNEL_STAGES.map((stage) =>
      stage.statuses.reduce((sum, st) => sum + (byStatus[st] || 0), 0));
    const sig = counts.join(',');
    if (host.dataset.sig === sig) return;
    host.dataset.sig = sig;
    const max = Math.max(...counts, 1);
    host.innerHTML = FUNNEL_STAGES.map((stage, i) => {
      const c = counts[i];
      const pct = (c / max) * 100;
      return `<div class="funnel-row ${c === 0 ? 'is-zero' : ''}">
        <span class="funnel-label" title="${esc(stage.statuses.join(', '))}">${esc(stage.label)}</span>
        <div class="funnel-track"><div class="funnel-fill" style="width:${Math.max(c > 0 ? 4 : 0, pct)}%"></div></div>
        <span class="funnel-count">${c}</span>
      </div>`;
    }).join('');
    if (G) {
      G.from(host.querySelectorAll('.funnel-fill'), {
        scaleX: 0, duration: 0.6, ease: 'power3.out', stagger: 0.05,
      });
    }
  }

  /* ---------- Aktivitäts-Feed ---------- */

  function renderFeed() {
    const host = $('feed');
    const empty = $('feed-empty');
    const events = [];
    for (const job of state.jobs) {
      if (job.scraped_at) {
        events.push({
          time: job.scraped_at,
          html: `Neu gefunden: <strong>${esc(job.title)}</strong>${job.score != null ? ` <span class="feed-score">(${job.score}/100)</span>` : ''}`,
        });
      }
      if (job.last_checked_at && job.last_checked_at !== job.scraped_at) {
        events.push({
          time: job.last_checked_at,
          html: `Geprüft: <strong>${esc(job.title)}</strong>${job.score != null ? ` <span class="feed-score">(${job.score}/100)</span>` : ''}`,
        });
      }
    }
    events.sort((a, b) => (a.time < b.time ? 1 : -1));
    const top = events.slice(0, 20);
    if (top.length === 0) {
      host.innerHTML = '';
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    const sig = top.map((e) => e.time + e.html).join('|');
    if (host.dataset.sig === sig) return;
    host.dataset.sig = sig;
    host.innerHTML = top.map((e) =>
      `<li><span class="feed-time">${fmtTimeShort(e.time)}</span><span class="feed-text">${e.html}</span></li>`
    ).join('');
    if (G && !state.firstLoad) {
      G.from(host.querySelectorAll('li'), { opacity: 0, x: -8, duration: 0.4, stagger: 0.03 });
    }
  }

  /* ---------- Tabelle ---------- */

  function visibleJobs() {
    const q = state.search.toLowerCase();
    let rows = state.jobs.filter((j) => {
      if (state.filterRecommendation && j.recommendation !== state.filterRecommendation) return false;
      if (state.filterStatus && j.status !== state.filterStatus) return false;
      if (q) {
        const hay = `${j.title} ${j.company} ${j.location}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const { sortKey, sortDir } = state;
    const dir = sortDir === 'asc' ? 1 : -1;
    rows = rows.slice().sort((a, b) => {
      let av = a[sortKey];
      let bv = b[sortKey];
      if (sortKey === 'score') {
        if (av == null && bv == null) return 0;
        if (av == null) return 1; // NULL immer zuletzt
        if (bv == null) return -1;
        return (av - bv) * dir;
      }
      av = String(av ?? '').toLowerCase();
      bv = String(bv ?? '').toLowerCase();
      return av.localeCompare(bv, 'de') * dir;
    });
    return rows;
  }

  function statusSelectHtml(job) {
    const opts = STATUS_VALUES.map((s) =>
      `<option value="${esc(s)}" ${s === job.status ? 'selected' : ''}>${esc(s)}</option>`).join('');
    return `<select class="status-select" data-id="${job.id}" aria-label="Status für ${esc(job.title)}">${opts}</select>`;
  }

  function rowHtml(job, isNew) {
    const open = state.expanded.has(job.id);
    return `<tr class="job-row ${job.incomplete ? 'row-incomplete' : ''} ${isNew ? 'row-new' : ''}" data-id="${job.id}">
      <td><button class="chevron-btn ${open ? 'open' : ''}" data-action="toggle" aria-label="Details">${open ? '▾' : '▸'}</button></td>
      <td><span class="score-badge ${scoreClass(job.score)}">${job.score != null ? job.score : '–'}</span></td>
      <td><span class="chip ${chipClass(job.recommendation)}">${esc(job.recommendation || 'unbewertet')}</span></td>
      <td class="th-title">
        <span class="job-title">${esc(job.title)}<span class="ext">↗</span></span>
        ${job.incomplete ? '<span class="incomplete-tag">unvollständig geprüft</span>' : ''}
      </td>
      <td class="cell-company">${esc(job.company)}</td>
      <td class="cell-location">${esc(job.location)}${job.remote_option ? `<span class="remote-note">${esc(job.remote_option)}</span>` : ''}</td>
      <td>${statusSelectHtml(job)}</td>
      <td>${job.cvFile
        ? `<button class="cv-btn" data-action="cv">CV ansehen</button>`
        : '<span class="cv-none">–</span>'}</td>
    </tr>${open ? detailRowHtml(job) : ''}`;
  }

  function breakdownHtml(job) {
    const bd = job.score_breakdown;
    if (!bd) return '<p class="detail-empty">Kein Score-Breakdown vorhanden.</p>';
    return BREAKDOWN_SPEC.map(({ key, label, max }) => {
      const val = typeof bd[key] === 'number' ? bd[key] : 0;
      const ratio = max > 0 ? val / max : 0;
      const fillCls = ratio >= 0.7 ? '' : ratio >= 0.45 ? 'fill-mid' : 'fill-low';
      return `<div class="breakdown-bar">
        <div class="breakdown-label"><span>${label}</span><span class="mono">${val}/${max}</span></div>
        <div class="breakdown-track"><div class="breakdown-fill ${fillCls}" data-w="${(ratio * 100).toFixed(1)}"></div></div>
      </div>`;
    }).join('');
  }

  function listHtml(items, emptyText) {
    if (!Array.isArray(items) || items.length === 0) return `<p class="detail-empty">${emptyText}</p>`;
    return `<ul class="criteria-list">${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;
  }

  function chipsHtml(items, cls, emptyText) {
    if (!Array.isArray(items) || items.length === 0) return `<p class="detail-empty">${emptyText}</p>`;
    return `<div class="chip-list">${items.map((i) => `<span class="mini-chip ${cls}">${esc(i)}</span>`).join('')}</div>`;
  }

  function detailRowHtml(job) {
    return `<tr class="detail-row" data-detail="${job.id}"><td colspan="8"><div class="detail-inner">
      <div>
        <div class="detail-section">
          <h4>Score-Breakdown</h4>
          ${breakdownHtml(job)}
        </div>
        <div class="detail-section">
          <h4>Begründung</h4>
          ${job.score_reasoning ? `<p class="reasoning">${esc(job.score_reasoning)}</p>` : '<p class="detail-empty">Keine Begründung vorhanden.</p>'}
        </div>
      </div>
      <div>
        <div class="detail-section">
          <h4>Stärken (CV-Matches)</h4>
          ${chipsHtml(job.cv_matches, '', 'Keine Stärken erfasst.')}
        </div>
        <div class="detail-section">
          <h4>Lücken</h4>
          ${chipsHtml(job.gaps, 'gap', 'Keine Lücken erfasst.')}
        </div>
        <div class="detail-section detail-cols">
          <div>
            <h4>Muss-Kriterien</h4>
            ${listHtml(job.must_criteria, 'Keine Muss-Kriterien erfasst.')}
          </div>
          <div>
            <h4>Kann-Kriterien</h4>
            ${listHtml(job.nice_criteria, 'Keine Kann-Kriterien erfasst.')}
          </div>
        </div>
        <div class="detail-section">
          <h4>CV-Optimierungsvorschläge</h4>
          ${listHtml(job.cv_optimization_suggestions, 'Keine Vorschläge vorhanden.')}
        </div>
      </div>
    </div></td></tr>`;
  }

  function renderTable() {
    const rows = visibleJobs();
    $('table-empty').hidden = rows.length > 0;
    const newIds = [];
    tbody.innerHTML = rows.map((job) => {
      const isNew = !state.firstLoad && !state.knownIds.has(job.id);
      if (isNew) newIds.push(job.id);
      return rowHtml(job, isNew);
    }).join('');

    // Sortier-Indikatoren
    document.querySelectorAll('th.sortable').forEach((th) => {
      th.dataset.dir = th.dataset.sort === state.sortKey ? state.sortDir : '';
    });

    if (G) {
      if (state.firstLoad) {
        G.from(tbody.querySelectorAll('tr.job-row'), {
          opacity: 0, y: 10, duration: 0.45, ease: 'power2.out', stagger: 0.025, clearProps: 'all',
        });
      } else if (newIds.length > 0) {
        G.from(tbody.querySelectorAll('tr.row-new'), {
          opacity: 0, x: -20, duration: 0.6, ease: 'power3.out', stagger: 0.06, clearProps: 'all',
        });
      }
      animateBreakdownBars(tbody, false);
    } else {
      animateBreakdownBars(tbody, true);
    }
    if (!G) return;
  }

  function animateBreakdownBars(scope, instant) {
    scope.querySelectorAll('.breakdown-fill').forEach((el) => {
      const w = `${el.dataset.w}%`;
      if (instant || !G) {
        el.style.width = w;
      } else if (!el.dataset.done) {
        el.dataset.done = '1';
        G.fromTo(el, { width: '0%' }, { width: w, duration: 0.8, ease: 'power3.out' });
      } else {
        el.style.width = w;
      }
    });
  }

  /* ---------- Interaktion ---------- */

  function toggleDetails(id) {
    if (state.expanded.has(id)) state.expanded.delete(id);
    else state.expanded.add(id);
    renderTable();
  }

  tbody.addEventListener('click', (e) => {
    const row = e.target.closest('tr.job-row');
    if (!row) return;
    const id = Number(row.dataset.id);
    const job = state.jobs.find((j) => j.id === id);
    if (!job) return;
    if (e.target.closest('[data-action="toggle"]')) { toggleDetails(id); return; }
    if (e.target.closest('[data-action="cv"]')) { openCvOverlay(job); return; }
    if (e.target.closest('select')) return;
    if (job.url) window.open(job.url, '_blank', 'noopener');
  });

  tbody.addEventListener('change', async (e) => {
    const sel = e.target.closest('select.status-select');
    if (!sel) return;
    const id = Number(sel.dataset.id);
    const job = state.jobs.find((j) => j.id === id);
    const prev = job ? job.status : null;
    const next = sel.value;
    sel.disabled = true;
    try {
      const res = await fetch(`/api/jobs/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (job) job.status = next;
      refresh(); // Stats/Funnel sofort nachziehen
    } catch (err) {
      console.error('Status-Update fehlgeschlagen', err);
      if (prev != null) sel.value = prev;
      alert('Status konnte nicht gespeichert werden.');
    } finally {
      sel.disabled = false;
    }
  });

  document.querySelectorAll('th.sortable').forEach((th) => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (state.sortKey === key) {
        state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortKey = key;
        state.sortDir = key === 'score' ? 'desc' : 'asc';
      }
      renderTable();
    });
  });

  $('search').addEventListener('input', (e) => { state.search = e.target.value.trim(); renderTable(); });
  $('filter-recommendation').addEventListener('change', (e) => { state.filterRecommendation = e.target.value; renderTable(); });
  $('filter-status').addEventListener('change', (e) => { state.filterStatus = e.target.value; renderTable(); });

  // Status-Filter befüllen
  (() => {
    const sel = $('filter-status');
    for (const s of STATUS_VALUES) {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      sel.appendChild(opt);
    }
  })();

  /* ---------- CV-Overlay ---------- */

  const overlay = $('cv-overlay');

  async function openCvOverlay(job) {
    $('cv-title').textContent = `für ${job.title}`;
    $('cv-body').innerHTML = '<p class="detail-empty">Lade Lebenslauf …</p>';
    overlay.hidden = false;
    if (G) {
      G.fromTo(overlay.querySelector('.overlay-backdrop'), { opacity: 0 }, { opacity: 1, duration: 0.25 });
      G.fromTo(overlay.querySelector('.overlay-card'), { opacity: 0, y: 26, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: 'power3.out' });
    }
    try {
      const res = await fetch(`/api/cv/${job.id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const md = await res.text();
      $('cv-body').innerHTML = renderMarkdown(md);
      if (G) {
        G.from($('cv-body').children, { opacity: 0, y: 8, duration: 0.4, stagger: 0.015, ease: 'power2.out', clearProps: 'all' });
      }
    } catch {
      $('cv-body').innerHTML = '<p class="detail-empty">Lebenslauf konnte nicht geladen werden.</p>';
    }
  }

  function closeCvOverlay() {
    if (G) {
      G.to(overlay.querySelector('.overlay-card'), {
        opacity: 0, y: 16, duration: 0.2, ease: 'power2.in',
        onComplete: () => { overlay.hidden = true; },
      });
      G.to(overlay.querySelector('.overlay-backdrop'), { opacity: 0, duration: 0.2 });
    } else {
      overlay.hidden = true;
    }
  }

  $('cv-close').addEventListener('click', closeCvOverlay);
  $('cv-backdrop').addEventListener('click', closeCvOverlay);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.hidden) closeCvOverlay();
  });

  /* ---------- Polling ---------- */

  async function refresh() {
    try {
      const [jobsRes, statsRes] = await Promise.all([fetch('/api/jobs'), fetch('/api/stats')]);
      if (!jobsRes.ok || !statsRes.ok) throw new Error('API-Fehler');
      const jobsJson = await jobsRes.text();
      const statsJson = await statsRes.text();
      $('live-dot').classList.remove('offline');
      $('live-text').textContent = `zuletzt aktualisiert ${fmtTime(new Date().toISOString())}`;

      const jobsChanged = jobsJson !== state.lastJobsJson;
      const statsChanged = statsJson !== state.lastStatsJson;
      if (!jobsChanged && !statsChanged) return;

      if (jobsChanged) {
        state.jobs = JSON.parse(jobsJson);
        state.lastJobsJson = jobsJson;
        renderTable();
        renderFeed();
        state.knownIds = new Set(state.jobs.map((j) => j.id));
      }
      if (statsChanged) {
        state.stats = JSON.parse(statsJson);
        state.lastStatsJson = statsJson;
        renderStats();
      }
      state.firstLoad = false;
    } catch (err) {
      console.error('Aktualisierung fehlgeschlagen', err);
      $('live-dot').classList.add('offline');
      $('live-text').textContent = 'Verbindung unterbrochen';
    }
  }

  refresh();
  setInterval(refresh, POLL_MS);
})();
