import { useState, useCallback, useEffect } from "react";

// Backendin osoite luetaan Viten ympäristömuuttujasta (VITE_API_URL).
// Kehityksessä oletus on tyhjä, jolloin /api proxytetään vite.config.js:n kautta.
// Tuotannossa aseta VITE_API_URL = backendin julkinen osoite.
const API_BASE = import.meta.env.VITE_API_URL ?? "";

// ─────────────────────────────────────────────────────────────────────────────
// Tämä komponentti käyttää alla olevaa MOCK_TAULUT-dataa, jotta sen voi ajaa
// heti ilman backendiä. Kun haluat kytkeä oikean datan, korvaa mock-haut
// fetch-kutsuilla backendiin, esim:
//     const res = await fetch("/api/kayttajat");
//     const data = await res.json();
// (/api proxytetään backendiin sekä Vite-kehityksessä että nginx-tuotannossa.)
// ─────────────────────────────────────────────────────────────────────────────

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_TREE = [
  {
    id: 1, type: "folder", nimi: "Perustiedot", ikoni: "🗂", lapset: [
      { id: 2, type: "taulu", nimi: "Asiakkaat", ikoni: "👥" },
      { id: 3, type: "taulu", nimi: "Yritykset", ikoni: "🏢" },
    ]
  },
  {
    id: 4, type: "folder", nimi: "Myynti", ikoni: "🗂", lapset: [
      { id: 5, type: "taulu", nimi: "Tilaukset", ikoni: "📋" },
      { id: 6, type: "taulu", nimi: "Laskut", ikoni: "💰" },
    ]
  },
  {
    id: 7, type: "folder", nimi: "Tuotteet", ikoni: "🗂", lapset: [
      { id: 8, type: "taulu", nimi: "Nimikkeet", ikoni: "📦" },
    ]
  },
];

const MOCK_TAULUT = {
  Asiakkaat: {
    sarakkeet: ["Etunimi", "Sukunimi", "Email", "Yritys"],
    tyypit:    ["text",    "text",     "text",  "viittaus"],
    rivit: [
      { id: 1, masterrivi_id: 1, arvot: ["Matti",  "Meikäläinen", "matti@ex.fi",  "Acme Oy"],  voimassa: "1.1.2024 →", tila: "aktiivinen" },
      { id: 2, masterrivi_id: 2, arvot: ["Liisa",  "Virtanen",    "liisa@ex.fi",  "—"],         voimassa: "3.3.2024 →", tila: "aktiivinen" },
      { id: 3, masterrivi_id: 3, arvot: ["Keijo",  "Korhonen",    "keijo@ex.fi",  "Beta Oy"],   voimassa: "5.5.2024 →", tila: "aktiivinen" },
    ],
    alitaulut: [],
  },
  Yritykset: {
    sarakkeet: ["Nimi", "Y-tunnus", "Kaupunki"],
    tyypit:    ["text", "text",     "text"],
    rivit: [
      { id: 1, masterrivi_id: 10, arvot: ["Acme Oy",  "1234567-8", "Helsinki"], voimassa: "1.1.2023 →", tila: "aktiivinen" },
      { id: 2, masterrivi_id: 11, arvot: ["Beta Oy",  "8765432-1", "Tampere"],  voimassa: "1.2.2023 →", tila: "aktiivinen" },
    ],
    alitaulut: [],
  },
  Tilaukset: {
    sarakkeet: ["Asiakas", "Päivämäärä", "Summa", "Tila"],
    tyypit:    ["viittaus","date",       "decimal","text"],
    rivit: [
      { id: 1, masterrivi_id: 20, arvot: ["Matti M.",  "1.6.2024", "149,90 €", "Avoin"],      voimassa: "1.6.2024 →",  tila: "aktiivinen" },
      { id: 2, masterrivi_id: 21, arvot: ["Liisa V.",  "3.6.2024", "890,00 €", "Laskutettu"], voimassa: "3.6.2024 →",  tila: "aktiivinen" },
      { id: 3, masterrivi_id: 22, arvot: ["Keijo K.",  "5.6.2024",  "44,50 €", "Avoin"],      voimassa: "5.6.2024 →",  tila: "aktiivinen" },
    ],
    alitaulut: ["Tilausrivit", "Laskut"],
  },
  Tilausrivit: {
    sarakkeet: ["Nimike", "Määrä", "Á-hinta", "Yhteensä"],
    tyypit:    ["viittaus","text", "decimal", "decimal"],
    rivitPerMaster: {
      20: [
        { id: 10, masterrivi_id: 30, arvot: ["Tuote A",    "2 kpl", "99,00 €",  "198,00 €"], voimassa: "1.6.2024 →", tila: "aktiivinen" },
      ],
      21: [
        { id: 11, masterrivi_id: 31, arvot: ["Palvelu B",  "5 h",   "50,00 €",  "250,00 €"], voimassa: "3.6.2024 →", tila: "aktiivinen" },
        { id: 12, masterrivi_id: 32, arvot: ["Tuote C",    "1 kpl", "442,00 €", "442,00 €"], voimassa: "3.6.2024 →", tila: "aktiivinen" },
        { id: 13, masterrivi_id: 33, arvot: ["Tuote A",    "4 kpl", "99,00 €",  "396,00 €"], voimassa: "3.6.2024 →", tila: "aktiivinen" },
      ],
      22: [
        { id: 14, masterrivi_id: 34, arvot: ["Tuote A",    "1 kpl", "44,50 €",   "44,50 €"], voimassa: "5.6.2024 →", tila: "aktiivinen" },
      ],
    },
    alitaulut: ["Sarjanumerot"],
  },
  Laskut: {
    sarakkeet: ["Laskunro", "Päivämäärä", "Summa", "Maksettu"],
    tyypit:    ["text",     "date",       "decimal","text"],
    rivitPerMaster: {
      21: [
        { id: 20, masterrivi_id: 40, arvot: ["L-2024-001", "5.6.2024", "890,00 €", "Kyllä"], voimassa: "5.6.2024 →", tila: "aktiivinen" },
      ],
    },
    alitaulut: [],
  },
  Sarjanumerot: {
    sarakkeet: ["Sarjanumero", "Rekisteröity", "Takuu loppuu"],
    tyypit:    ["text",        "date",         "date"],
    rivitPerMaster: {
      31: [
        { id: 30, masterrivi_id: 50, arvot: ["SN-001234", "1.6.2024", "1.6.2026"], voimassa: "1.6.2024 →", tila: "aktiivinen" },
      ],
      32: [
        { id: 31, masterrivi_id: 51, arvot: ["SN-005678", "3.6.2024", "3.6.2026"], voimassa: "3.6.2024 →", tila: "aktiivinen" },
      ],
    },
    alitaulut: [],
  },
  Nimikkeet: {
    sarakkeet: ["Koodi", "Nimi", "Hinta", "Varasto"],
    tyypit:    ["text",  "text", "decimal","text"],
    rivit: [
      { id: 1, masterrivi_id: 60, arvot: ["NIM-001", "Tuote A",   "99,00 €",  "142 kpl"], voimassa: "1.1.2024 →", tila: "aktiivinen" },
      { id: 2, masterrivi_id: 61, arvot: ["NIM-002", "Palvelu B", "50,00 €",  "—"],       voimassa: "1.1.2024 →", tila: "aktiivinen" },
      { id: 3, masterrivi_id: 62, arvot: ["NIM-003", "Tuote C",   "442,00 €", "8 kpl"],   voimassa: "1.1.2024 →", tila: "aktiivinen" },
    ],
    alitaulut: [],
  },
  Laskut_root: {
    sarakkeet: ["Laskunro", "Asiakas", "Päivämäärä", "Summa"],
    tyypit:    ["text",     "viittaus","date",       "decimal"],
    rivit: [
      { id: 1, masterrivi_id: 40, arvot: ["L-2024-001", "Liisa V.", "5.6.2024", "890,00 €"], voimassa: "5.6.2024 →", tila: "aktiivinen" },
    ],
    alitaulut: [],
  },
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const css = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:       #ffffff;
    --surface:  #f7f8fa;
    --surface2: #eef1f5;
    --border:   #e2e6ec;
    --border2:  #cdd4de;
    --accent:   #2d6fe0;
    --accent2:  #1f54b8;
    --green:    #1f9d63;
    --amber:    #c97a0e;
    --red:      #d23b3b;
    --text:     #1a2233;
    --text2:    #5b6678;
    --text3:    #97a1b2;
    --mono:     'IBM Plex Mono', monospace;
    --sans:     'IBM Plex Sans', sans-serif;
  }

  body { background: var(--bg); color: var(--text); font-family: var(--sans); }

  .app {
    display: grid;
    grid-template-columns: 240px 1fr;
    grid-template-rows: 48px 1fr;
    height: 100vh;
    overflow: hidden;
  }

  /* Topbar */
  .topbar {
    grid-column: 1 / -1;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    padding: 0 16px;
    gap: 12px;
  }
  .topbar-logo {
    font-family: var(--mono);
    font-size: 13px;
    font-weight: 500;
    color: var(--accent);
    letter-spacing: 0.05em;
  }
  .topbar-sep { width: 1px; height: 20px; background: var(--border); }
  .topbar-title { font-size: 13px; color: var(--text2); flex: 1; }
  .topbar-btn {
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: 4px;
    padding: 5px 12px;
    font-size: 12px;
    font-family: var(--sans);
    font-weight: 500;
    cursor: pointer;
    display: flex; align-items: center; gap: 5px;
  }
  .topbar-btn:hover { background: var(--accent2); }

  /* Sidebar */
  .sidebar {
    background: var(--surface);
    border-right: 1px solid var(--border);
    overflow-y: auto;
    padding: 8px 0;
  }
  .sidebar-section {
    padding: 6px 12px 2px;
    font-size: 10px;
    font-family: var(--mono);
    color: var(--text3);
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .tree-folder {
    user-select: none;
  }
  .tree-folder-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    cursor: pointer;
    font-size: 13px;
    color: var(--text2);
    transition: background 0.1s;
  }
  .tree-folder-header:hover { background: var(--surface2); }
  .tree-chevron {
    font-size: 9px;
    color: var(--text3);
    transition: transform 0.15s;
    width: 10px;
  }
  .tree-chevron.open { transform: rotate(90deg); }
  .tree-children { padding-left: 10px; }

  .tree-item {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 5px 12px 5px 22px;
    font-size: 13px;
    color: var(--text2);
    cursor: pointer;
    border-radius: 0;
    transition: background 0.1s, color 0.1s;
    border-left: 2px solid transparent;
  }
  .tree-item:hover { background: var(--surface2); color: var(--text); }
  .tree-item.active {
    background: rgba(79,142,247,0.1);
    color: var(--accent);
    border-left-color: var(--accent);
  }

  /* Main */
  .main {
    overflow-y: auto;
    background: var(--bg);
  }

  .view-header {
    padding: 20px 24px 0;
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .view-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--text);
  }
  .view-subtitle {
    font-size: 12px;
    color: var(--text3);
    font-family: var(--mono);
  }
  .view-spacer { flex: 1; }

  /* Tabs */
  .tabs {
    display: flex;
    gap: 0;
    padding: 16px 24px 0;
    border-bottom: 1px solid var(--border);
    margin: 0 0 0;
  }
  .tab {
    padding: 8px 16px;
    font-size: 13px;
    color: var(--text2);
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: color 0.1s, border-color 0.1s;
    background: none;
    border-top: none;
    border-left: none;
    border-right: none;
    font-family: var(--sans);
  }
  .tab:hover { color: var(--text); }
  .tab.active { color: var(--accent); border-bottom-color: var(--accent); }

  /* Toolbar */
  .toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
  }
  .search-box {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 5px;
    padding: 6px 10px;
    font-size: 12px;
    color: var(--text);
    font-family: var(--sans);
    width: 200px;
    outline: none;
  }
  .search-box:focus { border-color: var(--accent); }
  .search-box::placeholder { color: var(--text3); }
  .btn-ghost {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 5px;
    padding: 6px 12px;
    font-size: 12px;
    color: var(--text2);
    cursor: pointer;
    font-family: var(--sans);
    transition: border-color 0.1s, color 0.1s;
  }
  .btn-ghost:hover { border-color: var(--border2); color: var(--text); }
  .btn-primary {
    background: var(--accent);
    border: none;
    border-radius: 5px;
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 500;
    color: #fff;
    cursor: pointer;
    font-family: var(--sans);
    margin-left: auto;
  }
  .btn-primary:hover { background: var(--accent2); }

  /* Table */
  .table-wrap { padding: 0 24px 24px; }
  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  .data-table th {
    text-align: left;
    padding: 8px 12px;
    font-size: 11px;
    font-family: var(--mono);
    color: var(--text3);
    letter-spacing: 0.05em;
    border-bottom: 1px solid var(--border);
    font-weight: 400;
    background: var(--bg);
    position: sticky;
    top: 0;
    z-index: 1;
  }
  .data-table td {
    padding: 0;
    border-bottom: 1px solid var(--border);
    vertical-align: top;
  }
  .row-cell-wrap {
    padding: 9px 12px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .expand-btn {
    background: none;
    border: 1px solid var(--border);
    border-radius: 3px;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--text3);
    font-size: 9px;
    flex-shrink: 0;
    transition: border-color 0.1s, color 0.1s, background 0.1s;
  }
  .expand-btn:hover { border-color: var(--accent); color: var(--accent); }
  .expand-btn.expanded { background: rgba(79,142,247,0.15); border-color: var(--accent); color: var(--accent); }

  .cell-text { color: var(--text); }
  .cell-ref {
    color: var(--accent);
    font-size: 12px;
    display: flex; align-items: center; gap: 3px;
  }
  .cell-ref::before { content: "↗"; font-size: 10px; }

  .tag {
    display: inline-flex;
    align-items: center;
    padding: 2px 7px;
    border-radius: 3px;
    font-size: 11px;
    font-family: var(--mono);
  }
  .tag-green { background: rgba(62,207,142,0.12); color: var(--green); }
  .tag-amber { background: rgba(245,166,35,0.12); color: var(--amber); }
  .tag-gray  { background: rgba(139,150,176,0.1); color: var(--text2); }

  .voimassa-text { font-size: 11px; font-family: var(--mono); color: var(--text3); }

  /* Row actions */
  .row-actions {
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.1s;
  }
  tr:hover .row-actions { opacity: 1; }
  .action-btn {
    background: none;
    border: none;
    padding: 2px 5px;
    cursor: pointer;
    font-size: 12px;
    border-radius: 3px;
    color: var(--text3);
    transition: color 0.1s, background 0.1s;
  }
  .action-btn:hover { color: var(--text); background: var(--surface2); }

  /* Detail panel */
  .detail-panel {
    background: var(--surface);
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
  }
  .detail-indent {
    padding-left: 32px;
  }
  .detail-tabs {
    display: flex;
    padding: 0 12px;
    border-bottom: 1px solid var(--border);
    background: var(--surface2);
  }
  .detail-tab {
    padding: 7px 14px;
    font-size: 12px;
    color: var(--text2);
    cursor: pointer;
    border-bottom: 2px solid transparent;
    background: none;
    border-top: none;
    border-left: none;
    border-right: none;
    font-family: var(--sans);
    transition: color 0.1s;
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .detail-tab:hover { color: var(--text); }
  .detail-tab.active { color: var(--accent); border-bottom-color: var(--accent); }
  .detail-count {
    background: var(--surface);
    border-radius: 10px;
    padding: 1px 6px;
    font-size: 10px;
    font-family: var(--mono);
    color: var(--text3);
  }

  .detail-content {
    padding: 12px;
  }
  .detail-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  .detail-table th {
    text-align: left;
    padding: 5px 10px;
    font-size: 10px;
    font-family: var(--mono);
    color: var(--text3);
    border-bottom: 1px solid var(--border);
    font-weight: 400;
    letter-spacing: 0.05em;
  }
  .detail-table td {
    padding: 0;
    border-bottom: 1px solid rgba(42,51,71,0.5);
    vertical-align: top;
  }
  .detail-table tr:last-child td { border-bottom: none; }

  .detail-toolbar {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    border-top: 1px solid var(--border);
  }
  .btn-sm {
    background: none;
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 4px 10px;
    font-size: 11px;
    color: var(--text2);
    cursor: pointer;
    font-family: var(--sans);
    display: flex; align-items: center; gap: 4px;
    transition: border-color 0.1s, color 0.1s;
  }
  .btn-sm:hover { border-color: var(--accent); color: var(--accent); }

  /* Depth indicator */
  .depth-bar {
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 2px;
  }
  .depth-1 { background: var(--accent); }
  .depth-2 { background: var(--green); }
  .depth-3 { background: var(--amber); }

  /* Sarakkeet tab */
  .sarake-list { padding: 16px 24px; }
  .sarake-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    border: 1px solid var(--border);
    border-radius: 5px;
    margin-bottom: 4px;
    background: var(--surface);
    font-size: 13px;
  }
  .sarake-drag { color: var(--text3); cursor: grab; font-size: 10px; }
  .sarake-num { font-family: var(--mono); color: var(--text3); font-size: 11px; width: 18px; }
  .sarake-nimi { font-weight: 500; flex: 1; }
  .type-badge {
    padding: 2px 8px;
    border-radius: 3px;
    font-size: 11px;
    font-family: var(--mono);
  }
  .type-text     { background: rgba(139,150,176,0.1); color: var(--text2); }
  .type-date     { background: rgba(79,142,247,0.1);  color: var(--accent); }
  .type-decimal  { background: rgba(62,207,142,0.1);  color: var(--green); }
  .type-viittaus { background: rgba(245,166,35,0.1);  color: var(--amber); }
  .type-boolean  { background: rgba(224,82,82,0.1);   color: var(--red); }

  /* Empty state */
  .empty-state {
    padding: 40px;
    text-align: center;
    color: var(--text3);
    font-size: 13px;
  }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 3px; }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRows(taulu, parentMasterrivi_id) {
  const t = MOCK_TAULUT[taulu];
  if (!t) return [];
  if (parentMasterrivi_id !== undefined) {
    return (t.rivitPerMaster || {})[parentMasterrivi_id] || [];
  }
  return t.rivit || [];
}

function getCount(taulu, parentMasterrivi_id) {
  return getRows(taulu, parentMasterrivi_id).length;
}

function typeBadgeClass(t) {
  if (t === "viittaus") return "type-badge type-viittaus";
  if (t === "date")     return "type-badge type-date";
  if (t === "decimal")  return "type-badge type-decimal";
  if (t === "boolean")  return "type-badge type-boolean";
  return "type-badge type-text";
}

function tilaBadge(tila) {
  if (tila === "aktiivinen") return <span className="tag tag-green">aktiivinen</span>;
  if (tila === "korvattu")   return <span className="tag tag-amber">korvattu</span>;
  return <span className="tag tag-gray">{tila}</span>;
}

// ─── DetailTable (recursive, depth-limited) ──────────────────────────────────

function DetailTable({ tauluNimi, parentMasterrivi_id, depth }) {
  const [expandedRows, setExpandedRows] = useState({});
  const [activeTabs, setActiveTabs]     = useState({});

  const taulu = MOCK_TAULUT[tauluNimi];
  if (!taulu) return null;

  const MAX_DEPTH = 3;
  const rivit = getRows(tauluNimi, parentMasterrivi_id);

  const toggleRow = (id) =>
    setExpandedRows(p => ({ ...p, [id]: !p[id] }));
  const getTab = (id) =>
    activeTabs[id] ?? taulu.alitaulut[0];
  const setTab = (id, tab) =>
    setActiveTabs(p => ({ ...p, [id]: tab }));

  if (rivit.length === 0)
    return <div style={{ padding: "10px 12px", fontSize: 12, color: "var(--text3)" }}>Ei rivejä</div>;

  return (
    <table className="detail-table" style={{ width: "100%" }}>
      <thead>
        <tr>
          {depth < MAX_DEPTH && taulu.alitaulut.length > 0 && <th style={{ width: 30 }}></th>}
          {taulu.sarakkeet.map(s => <th key={s}>{s}</th>)}
          <th>Voimassa</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {rivit.map(rivi => {
          const isExpanded = expandedRows[rivi.id];
          const activeTab  = getTab(rivi.id);
          const hasDetail  = depth < MAX_DEPTH && taulu.alitaulut.length > 0;
          const isLimit    = depth >= MAX_DEPTH && taulu.alitaulut.length > 0;

          return [
            <tr key={rivi.id} style={{ position: "relative" }}>
              {hasDetail && (
                <td>
                  <div className="row-cell-wrap" style={{ padding: "7px 8px" }}>
                    <button
                      className={`expand-btn${isExpanded ? " expanded" : ""}`}
                      onClick={() => toggleRow(rivi.id)}
                      title="Näytä alitaulut"
                    >
                      {isExpanded ? "▼" : "▶"}
                    </button>
                  </div>
                </td>
              )}
              {!hasDetail && taulu.alitaulut.length > 0 && <td></td>}
              {rivi.arvot.map((a, i) => (
                <td key={i}>
                  <div className="row-cell-wrap" style={{ padding: "7px 10px" }}>
                    {taulu.tyypit?.[i] === "viittaus"
                      ? <span className="cell-ref">{a}</span>
                      : <span className="cell-text">{a}</span>}
                  </div>
                </td>
              ))}
              <td>
                <div className="row-cell-wrap" style={{ padding: "7px 10px" }}>
                  <span className="voimassa-text">{rivi.voimassa}</span>
                </div>
              </td>
              <td>
                <div className="row-cell-wrap row-actions" style={{ padding: "7px 8px" }}>
                  {isLimit && (
                    <button className="action-btn" title="Avaa erillisessä näkymässä">↗</button>
                  )}
                  <button className="action-btn">✏</button>
                  <button className="action-btn">🕐</button>
                </div>
              </td>
            </tr>,

            isExpanded && hasDetail && (
              <tr key={`detail-${rivi.id}`}>
                <td colSpan={taulu.sarakkeet.length + 3}
                    style={{ padding: 0, background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ borderLeft: `2px solid ${depth === 1 ? "var(--green)" : "var(--amber)"}`, marginLeft: 20 }}>
                    <div className="detail-tabs">
                      {taulu.alitaulut.map(at => (
                        <button
                          key={at}
                          className={`detail-tab${activeTab === at ? " active" : ""}`}
                          onClick={() => setTab(rivi.id, at)}
                        >
                          {at}
                          <span className="detail-count">{getCount(at, rivi.masterrivi_id)}</span>
                        </button>
                      ))}
                    </div>
                    <div style={{ padding: "8px 12px" }}>
                      <DetailTable
                        tauluNimi={activeTab}
                        parentMasterrivi_id={rivi.masterrivi_id}
                        depth={depth + 1}
                      />
                    </div>
                    <div className="detail-toolbar">
                      <button className="btn-sm">+ Uusi {activeTab.slice(0,-1)}</button>
                    </div>
                  </div>
                </td>
              </tr>
            )
          ];
        })}
      </tbody>
    </table>
  );
}

// ─── RivitTab ─────────────────────────────────────────────────────────────────

function RivitTab({ tauluNimi }) {
  const [expandedRows, setExpandedRows] = useState({});
  const [activeTabs, setActiveTabs]     = useState({});

  const taulu = MOCK_TAULUT[tauluNimi];
  if (!taulu) return <div className="empty-state">Valitse taulu vasemmalta</div>;

  const rivit = taulu.rivit || [];
  const toggleRow = (id) => setExpandedRows(p => ({ ...p, [id]: !p[id] }));
  const getTab = (id) => activeTabs[id] ?? taulu.alitaulut[0];
  const setTab = (id, tab) => setActiveTabs(p => ({ ...p, [id]: tab }));

  return (
    <>
      <div className="toolbar">
        <input className="search-box" placeholder="🔍  Haku..." />
        <button className="btn-ghost">Suodattimet ▾</button>
        <button className="btn-ghost">Aktiiviset ▾</button>
        <button className="btn-primary">+ Uusi rivi</button>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {taulu.alitaulut.length > 0 && <th style={{ width: 36 }}></th>}
              <th>#</th>
              {taulu.sarakkeet.map(s => <th key={s}>{s}</th>)}
              <th>Voimassa</th>
              <th>Tila</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rivit.map(rivi => {
              const isExpanded = expandedRows[rivi.id];
              const activeTab  = getTab(rivi.id);

              return [
                <tr key={rivi.id}>
                  {taulu.alitaulut.length > 0 && (
                    <td>
                      <div className="row-cell-wrap">
                        <button
                          className={`expand-btn${isExpanded ? " expanded" : ""}`}
                          onClick={() => toggleRow(rivi.id)}
                        >
                          {isExpanded ? "▼" : "▶"}
                        </button>
                      </div>
                    </td>
                  )}
                  <td>
                    <div className="row-cell-wrap">
                      <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text3)" }}>
                        {rivi.masterrivi_id}
                      </span>
                    </div>
                  </td>
                  {rivi.arvot.map((a, i) => (
                    <td key={i}>
                      <div className="row-cell-wrap">
                        {taulu.tyypit?.[i] === "viittaus"
                          ? <span className="cell-ref">{a}</span>
                          : <span className="cell-text">{a}</span>}
                      </div>
                    </td>
                  ))}
                  <td>
                    <div className="row-cell-wrap">
                      <span className="voimassa-text">{rivi.voimassa}</span>
                    </div>
                  </td>
                  <td>
                    <div className="row-cell-wrap">
                      {tilaBadge(rivi.tila)}
                    </div>
                  </td>
                  <td>
                    <div className="row-cell-wrap row-actions">
                      <button className="action-btn" title="Muokkaa">✏</button>
                      <button className="action-btn" title="Historia">🕐</button>
                      <button className="action-btn" title="Uusi versio">⎘</button>
                    </div>
                  </td>
                </tr>,

                isExpanded && taulu.alitaulut.length > 0 && (
                  <tr key={`detail-${rivi.id}`}>
                    <td colSpan={taulu.sarakkeet.length + 4}
                        style={{ padding: 0, background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
                      <div style={{ borderLeft: "2px solid var(--accent)", marginLeft: 18 }}>
                        <div className="detail-tabs">
                          {taulu.alitaulut.map(at => (
                            <button
                              key={at}
                              className={`detail-tab${activeTab === at ? " active" : ""}`}
                              onClick={() => setTab(rivi.id, at)}
                            >
                              {at}
                              <span className="detail-count">{getCount(at, rivi.masterrivi_id)}</span>
                            </button>
                          ))}
                        </div>
                        <div style={{ padding: "10px 12px" }}>
                          <DetailTable
                            tauluNimi={activeTab}
                            parentMasterrivi_id={rivi.masterrivi_id}
                            depth={1}
                          />
                        </div>
                        <div className="detail-toolbar">
                          <button className="btn-sm">+ Uusi {activeTab?.slice(0, -1)}</button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              ];
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ─── SarakkeetTab ─────────────────────────────────────────────────────────────

function SarakkeetTab({ tauluNimi }) {
  const taulu = MOCK_TAULUT[tauluNimi];
  if (!taulu) return null;
  return (
    <div className="sarake-list">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button className="btn-primary">+ Lisää sarake</button>
      </div>
      {taulu.sarakkeet.map((s, i) => (
        <div className="sarake-row" key={s}>
          <span className="sarake-drag">⠿</span>
          <span className="sarake-num">{i + 1}</span>
          <span className="sarake-nimi">{s}</span>
          <span className={typeBadgeClass(taulu.tyypit?.[i] ?? "text")}>
            {taulu.tyypit?.[i] ?? "text"}
          </span>
          {taulu.tyypit?.[i] === "viittaus" && (
            <span style={{ fontSize: 12, color: "var(--amber)" }}>→ Asiakkaat</span>
          )}
          <span style={{ flex: 1 }}></span>
          <button className="action-btn">✏</button>
          <button className="action-btn" style={{ color: "var(--red)" }}>🗑</button>
        </div>
      ))}
    </div>
  );
}

// ─── RakenneTab ───────────────────────────────────────────────────────────────

function RakenneTab({ tauluNimi }) {
  const taulu = MOCK_TAULUT[tauluNimi];
  if (!taulu) return null;
  return (
    <div style={{ padding: "20px 24px" }}>
      <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 12 }}>Alitaulut</div>
      {taulu.alitaulut.length === 0
        ? <div style={{ color: "var(--text3)", fontSize: 13 }}>Ei alitauluja määritelty</div>
        : taulu.alitaulut.map(at => (
          <div key={at} className="sarake-row">
            <span style={{ fontSize: 16 }}>📋</span>
            <span className="sarake-nimi">{at}</span>
            <span className="tag tag-amber">alitaulu</span>
            <span style={{ flex: 1 }}></span>
            <button className="action-btn">↗ Avaa</button>
          </div>
        ))
      }
      <div style={{ marginTop: 12 }}>
        <button className="btn-sm">+ Linkitä alitaulu</button>
      </div>
    </div>
  );
}

// ─── API: oikea data backendistä ─────────────────────────────────────────────

function KayttajatTab() {
  const [kayttajat, setKayttajat] = useState([]);
  const [lataa, setLataa]         = useState(true);
  const [virhe, setVirhe]         = useState(null);

  const haeKayttajat = useCallback(async () => {
    setLataa(true);
    setVirhe(null);
    try {
      const res = await fetch(`${API_BASE}/kayttajat`);
      if (!res.ok) throw new Error(`Palvelin vastasi ${res.status}`);
      setKayttajat(await res.json());
    } catch (e) {
      setVirhe(e.message);
    } finally {
      setLataa(false);
    }
  }, []);

  // Hae kerran kun näkymä avataan
  useEffect(() => {
    haeKayttajat();
  }, [haeKayttajat]);

  return (
    <>
      <div className="toolbar">
        <button className="btn-ghost" onClick={haeKayttajat}>↻ Päivitä</button>
        <span className="view-subtitle" style={{ marginLeft: 8 }}>
          {API_BASE || "(proxy /api)"}
        </span>
      </div>
      <div className="table-wrap">
        {lataa && <div className="empty-state">Ladataan…</div>}
        {virhe && (
          <div className="empty-state" style={{ color: "var(--red)" }}>
            Virhe haettaessa käyttäjiä: {virhe}
          </div>
        )}
        {!lataa && !virhe && kayttajat.length === 0 && (
          <div className="empty-state">Ei käyttäjiä</div>
        )}
        {!lataa && !virhe && kayttajat.length > 0 && (
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Käyttäjätunnus</th>
                <th>Sähköposti</th>
                <th>Koko nimi</th>
                <th>Aktiivinen</th>
                <th>Ylläpitäjä</th>
              </tr>
            </thead>
            <tbody>
              {kayttajat.map(k => (
                <tr key={k.id}>
                  <td><div className="row-cell-wrap">
                    <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text3)" }}>{k.id}</span>
                  </div></td>
                  <td><div className="row-cell-wrap"><span className="cell-text">{k.kayttajatunnus}</span></div></td>
                  <td><div className="row-cell-wrap"><span className="cell-text">{k.email}</span></div></td>
                  <td><div className="row-cell-wrap"><span className="cell-text">{k.koko_nimi ?? "—"}</span></div></td>
                  <td><div className="row-cell-wrap">
                    {k.aktiivinen ? <span className="tag tag-green">kyllä</span> : <span className="tag tag-gray">ei</span>}
                  </div></td>
                  <td><div className="row-cell-wrap">
                    {k.yllapitaja ? <span className="tag tag-amber">kyllä</span> : <span className="tag tag-gray">ei</span>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

// ─── TreeNode ─────────────────────────────────────────────────────────────────

function TreeNode({ node, activeTaulu, onSelect, depth = 0 }) {
  const [open, setOpen] = useState(true);
  if (node.type === "folder") {
    return (
      <div className="tree-folder">
        <div className="tree-folder-header" onClick={() => setOpen(p => !p)}>
          <span className={`tree-chevron${open ? " open" : ""}`}>▶</span>
          <span>{node.ikoni}</span>
          <span>{node.nimi}</span>
        </div>
        {open && (
          <div className="tree-children">
            {node.lapset.map(c => (
              <TreeNode key={c.id} node={c} activeTaulu={activeTaulu} onSelect={onSelect} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }
  return (
    <div
      className={`tree-item${activeTaulu === node.nimi ? " active" : ""}`}
      onClick={() => onSelect(node.nimi)}
    >
      <span>{node.ikoni}</span>
      <span>{node.nimi}</span>
    </div>
  );
}

// ─── SarakeHallintaTab: oikeiden sarakkeiden hallinta backendistä ─────────────

const TYYPIT = ["text", "integer", "decimal", "date", "boolean", "viittaus"];

function SarakeHallintaTab({ taulu, kaikkiTaulut, onMuutos }) {
  const [sarakkeet, setSarakkeet] = useState([]);
  const [lataa, setLataa]   = useState(true);
  const [virhe, setVirhe]   = useState(null);
  const [lomakeAuki, setLomakeAuki] = useState(false);

  // Uuden sarakkeen lomakkeen tila
  const [nimi, setNimi]               = useState("");
  const [tietotyyppi, setTietotyyppi] = useState("text");
  const [pakollinen, setPakollinen]   = useState(false);
  const [viittausTauluId, setViittausTauluId] = useState("");
  const [tallentaa, setTallentaa]     = useState(false);

  const haeSarakkeet = useCallback(async () => {
    setLataa(true);
    setVirhe(null);
    try {
      const res = await fetch(`${API_BASE}/taulut/${taulu.id}/sarakkeet`);
      if (!res.ok) throw new Error(`Palvelin vastasi ${res.status}`);
      setSarakkeet(await res.json());
    } catch (e) {
      setVirhe(e.message);
    } finally {
      setLataa(false);
    }
  }, [taulu.id]);

  useEffect(() => { haeSarakkeet(); }, [haeSarakkeet]);

  const tyhjennaLomake = () => {
    setNimi(""); setTietotyyppi("text"); setPakollinen(false); setViittausTauluId("");
  };

  const lisaaSarake = async () => {
    if (!nimi.trim()) return;
    setTallentaa(true);
    setVirhe(null);
    try {
      const body = {
        nimi: nimi.trim(),
        tietotyyppi,
        pakollinen,
        viittaus_taulu_id: tietotyyppi === "viittaus" ? Number(viittausTauluId) : null,
      };
      const res = await fetch(`${API_BASE}/taulut/${taulu.id}/sarakkeet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const v = await res.json().catch(() => ({}));
        throw new Error(v.detail ? JSON.stringify(v.detail) : `Palvelin vastasi ${res.status}`);
      }
      tyhjennaLomake();
      setLomakeAuki(false);
      await haeSarakkeet();
      onMuutos?.();
    } catch (e) {
      setVirhe(e.message);
    } finally {
      setTallentaa(false);
    }
  };

  const poistaSarake = async (sarake) => {
    if (!confirm(`Poistetaanko sarake "${sarake.nimi}"?`)) return;
    setVirhe(null);
    try {
      const res = await fetch(`${API_BASE}/taulut/${taulu.id}/sarakkeet/${sarake.id}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) throw new Error(`Palvelin vastasi ${res.status}`);
      await haeSarakkeet();
      onMuutos?.();
    } catch (e) {
      setVirhe(e.message);
    }
  };

  const tauluNimellaId = (id) => kaikkiTaulut.find(t => t.id === id)?.nimi ?? `#${id}`;

  return (
    <div className="sarake-list">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <button className="btn-ghost" onClick={haeSarakkeet}>↻ Päivitä</button>
        <button className="btn-primary" onClick={() => setLomakeAuki(o => !o)}>
          {lomakeAuki ? "Peruuta" : "+ Lisää sarake"}
        </button>
      </div>

      {virhe && (
        <div className="empty-state" style={{ color: "var(--red)", textAlign: "left", padding: "8px 0" }}>
          Virhe: {virhe}
        </div>
      )}

      {lomakeAuki && (
        <div className="sarake-row" style={{ flexWrap: "wrap", gap: 12, padding: 16 }}>
          <input
            className="search-box" placeholder="Sarakkeen nimi" value={nimi}
            onChange={e => setNimi(e.target.value)} style={{ width: 200 }}
          />
          <select className="search-box" value={tietotyyppi}
            onChange={e => setTietotyyppi(e.target.value)} style={{ width: 130 }}>
            {TYYPIT.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {tietotyyppi === "viittaus" && (
            <select className="search-box" value={viittausTauluId}
              onChange={e => setViittausTauluId(e.target.value)} style={{ width: 180 }}>
              <option value="">— valitse kohde —</option>
              {kaikkiTaulut.filter(t => t.id !== taulu.id).map(t => (
                <option key={t.id} value={t.id}>{t.nimi}</option>
              ))}
            </select>
          )}
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text2)" }}>
            <input type="checkbox" checked={pakollinen} onChange={e => setPakollinen(e.target.checked)} />
            Pakollinen
          </label>
          <button className="btn-primary" onClick={lisaaSarake}
            disabled={tallentaa || !nimi.trim() || (tietotyyppi === "viittaus" && !viittausTauluId)}>
            {tallentaa ? "Tallennetaan…" : "Tallenna"}
          </button>
        </div>
      )}

      {lataa && <div className="empty-state">Ladataan…</div>}
      {!lataa && sarakkeet.length === 0 && (
        <div className="empty-state">Ei vielä sarakkeita — lisää ensimmäinen yltä.</div>
      )}
      {!lataa && sarakkeet.map((s, i) => (
        <div className="sarake-row" key={s.id}>
          <span className="sarake-num">{i + 1}</span>
          <span className="sarake-nimi">{s.nimi}</span>
          <span className={typeBadgeClass(s.tietotyyppi)}>{s.tietotyyppi}</span>
          {s.tietotyyppi === "viittaus" && s.viittaus_taulu_id && (
            <span style={{ fontSize: 12, color: "var(--amber)" }}>→ {tauluNimellaId(s.viittaus_taulu_id)}</span>
          )}
          {s.pakollinen && <span className="tag tag-gray">pakollinen</span>}
          <span style={{ flex: 1 }}></span>
          <button className="action-btn" style={{ color: "var(--red)" }} onClick={() => poistaSarake(s)}>🗑</button>
        </div>
      ))}
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  // Oikeat taulut backendistä
  const [taulut, setTaulut]         = useState([]);
  const [lataaTaulut, setLataa]     = useState(true);
  const [tauluVirhe, setTauluVirhe] = useState(null);

  // Valittu näkymä: taulu-id (numero), tai "__kayttajat__"
  const [valinta, setValinta]       = useState(null);
  const [activeTab, setActiveTab]   = useState("sarakkeet");

  // Uuden taulun luonti
  const [uusiAuki, setUusiAuki]     = useState(false);
  const [uusiNimi, setUusiNimi]     = useState("");
  const [uusiKuvaus, setUusiKuvaus] = useState("");
  const [tallentaa, setTallentaa]   = useState(false);

  const haeTaulut = useCallback(async () => {
    setLataa(true);
    setTauluVirhe(null);
    try {
      const res = await fetch(`${API_BASE}/taulut`);
      if (!res.ok) throw new Error(`Palvelin vastasi ${res.status}`);
      const data = await res.json();
      setTaulut(data);
      // Valitse ensimmäinen taulu jos mitään ei ole valittu
      setValinta(v => (v === null && data.length > 0 ? data[0].id : v));
    } catch (e) {
      setTauluVirhe(e.message);
    } finally {
      setLataa(false);
    }
  }, []);

  useEffect(() => { haeTaulut(); }, [haeTaulut]);

  const luoTaulu = async () => {
    if (!uusiNimi.trim()) return;
    setTallentaa(true);
    try {
      const res = await fetch(`${API_BASE}/taulut`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nimi: uusiNimi.trim(), kuvaus: uusiKuvaus.trim() || null }),
      });
      if (!res.ok) {
        const v = await res.json().catch(() => ({}));
        throw new Error(v.detail ? JSON.stringify(v.detail) : `Palvelin vastasi ${res.status}`);
      }
      const luotu = await res.json();
      setUusiNimi(""); setUusiKuvaus(""); setUusiAuki(false);
      await haeTaulut();
      setValinta(luotu.id);
      setActiveTab("sarakkeet");
    } catch (e) {
      setTauluVirhe(e.message);
    } finally {
      setTallentaa(false);
    }
  };

  const poistaTaulu = async (taulu) => {
    if (!confirm(`Poistetaanko taulu "${taulu.nimi}" ja kaikki sen sarakkeet?`)) return;
    try {
      const res = await fetch(`${API_BASE}/taulut/${taulu.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error(`Palvelin vastasi ${res.status}`);
      await haeTaulut();
      setValinta(null);
    } catch (e) {
      setTauluVirhe(e.message);
    }
  };

  const valittuTaulu = taulut.find(t => t.id === valinta);
  const tabs = [
    { id: "sarakkeet", label: "Sarakkeet" },
    { id: "rivit",     label: "Rivit" },
  ];

  return (
    <>
      <style>{css}</style>
      <div className="app">

        {/* Topbar */}
        <div className="topbar">
          <span className="topbar-logo">REKISTERI</span>
          <div className="topbar-sep"></div>
          <span className="topbar-title">Dynaaminen rekisterinhallinta</span>
          <button className="topbar-btn" onClick={() => setUusiAuki(o => !o)}>+ Uusi taulu</button>
        </div>

        {/* Sidebar */}
        <div className="sidebar">
          <div className="sidebar-section">Rekisterit</div>

          {lataaTaulut && <div className="empty-state" style={{ padding: 16 }}>Ladataan…</div>}
          {tauluVirhe && (
            <div style={{ padding: "8px 12px", fontSize: 12, color: "var(--red)" }}>
              {tauluVirhe}
            </div>
          )}
          {!lataaTaulut && taulut.length === 0 && (
            <div style={{ padding: "8px 12px", fontSize: 12, color: "var(--text3)" }}>
              Ei tauluja vielä
            </div>
          )}
          {taulut.map(t => (
            <div
              key={t.id}
              className={`tree-item${valinta === t.id ? " active" : ""}`}
              style={{ paddingLeft: 12 }}
              onClick={() => { setValinta(t.id); setActiveTab("sarakkeet"); }}
            >
              <span>📋</span>
              <span>{t.nimi}</span>
            </div>
          ))}

          {uusiAuki && (
            <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
              <input className="search-box" placeholder="Taulun nimi" value={uusiNimi}
                onChange={e => setUusiNimi(e.target.value)} style={{ width: "100%" }} />
              <input className="search-box" placeholder="Kuvaus (valinn.)" value={uusiKuvaus}
                onChange={e => setUusiKuvaus(e.target.value)} style={{ width: "100%" }} />
              <button className="btn-primary" onClick={luoTaulu}
                disabled={tallentaa || !uusiNimi.trim()} style={{ marginLeft: 0 }}>
                {tallentaa ? "Luodaan…" : "Luo taulu"}
              </button>
            </div>
          )}

          <div className="sidebar-section" style={{ marginTop: 16 }}>Järjestelmä</div>
          <div
            className={`tree-item${valinta === "__kayttajat__" ? " active" : ""}`}
            style={{ paddingLeft: 12 }}
            onClick={() => setValinta("__kayttajat__")}
          >
            <span>👤</span>
            <span>Käyttäjät</span>
          </div>
        </div>

        {/* Main */}
        <div className="main">
          {valinta === "__kayttajat__" ? (
            <>
              <div className="view-header">
                <span style={{ fontSize: 20 }}>👤</span>
                <span className="view-title">Käyttäjät</span>
                <span className="view-subtitle">oikeaa dataa backendistä</span>
              </div>
              <KayttajatTab />
            </>
          ) : valittuTaulu ? (
            <>
              <div className="view-header">
                <span style={{ fontSize: 20 }}>📋</span>
                <span className="view-title">{valittuTaulu.nimi}</span>
                <span className="view-subtitle">{valittuTaulu.kuvaus || "ei kuvausta"}</span>
                <span className="view-spacer" />
                <button className="btn-ghost" style={{ color: "var(--red)" }}
                  onClick={() => poistaTaulu(valittuTaulu)}>Poista taulu</button>
              </div>

              <div className="tabs">
                {tabs.map(t => (
                  <button key={t.id} className={`tab${activeTab === t.id ? " active" : ""}`}
                    onClick={() => setActiveTab(t.id)}>
                    {t.label}
                  </button>
                ))}
              </div>

              {activeTab === "sarakkeet" && (
                <SarakeHallintaTab taulu={valittuTaulu} kaikkiTaulut={taulut} onMuutos={haeTaulut} />
              )}
              {activeTab === "rivit" && (
                <div className="empty-state">
                  Rividata ei ole vielä käytössä — tämä tulee seuraavassa vaiheessa
                  (rivi/arvo-päätepisteet).
                </div>
              )}
            </>
          ) : (
            <div className="empty-state" style={{ marginTop: 60 }}>
              Valitse taulu vasemmalta tai luo uusi “+ Uusi taulu” -painikkeella.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
