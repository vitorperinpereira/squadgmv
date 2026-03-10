export function renderTaskDashboardPage(): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>GMV Task Control Room</title>
    <style>
      :root {
        --bg: #0d1016;
        --bg-accent: #151b24;
        --panel: rgba(18, 24, 34, 0.88);
        --panel-strong: rgba(10, 14, 20, 0.92);
        --line: rgba(255, 255, 255, 0.08);
        --text: #f5eddc;
        --muted: #94a0b5;
        --accent: #ff7a45;
        --accent-soft: rgba(255, 122, 69, 0.18);
        --teal: #89f0dd;
        --lime: #d4f56a;
        --rose: #ff9e9e;
        --amber: #f8c66b;
        --shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
        --display: "Bodoni MT", "Didot", "Times New Roman", serif;
        --body: "Trebuchet MS", "Gill Sans", sans-serif;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        color: var(--text);
        font-family: var(--body);
        background:
          radial-gradient(circle at top left, rgba(255, 122, 69, 0.18), transparent 28%),
          radial-gradient(circle at top right, rgba(137, 240, 221, 0.14), transparent 24%),
          linear-gradient(135deg, #0a0d13 0%, #111723 48%, #0b0f16 100%);
      }

      body::before {
        content: "";
        position: fixed;
        inset: 0;
        pointer-events: none;
        background-image:
          linear-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px);
        background-size: 32px 32px;
        mask-image: radial-gradient(circle at center, black 38%, transparent 88%);
      }

      .shell {
        width: min(1480px, calc(100vw - 32px));
        margin: 0 auto;
        padding: 32px 0 56px;
      }

      .hero {
        position: relative;
        overflow: hidden;
        border: 1px solid var(--line);
        border-radius: 30px;
        padding: 30px;
        background: linear-gradient(145deg, rgba(14, 19, 28, 0.96), rgba(22, 27, 38, 0.9));
        box-shadow: var(--shadow);
      }

      .hero::after {
        content: "";
        position: absolute;
        inset: auto -10% -38% auto;
        width: 340px;
        height: 340px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(255, 122, 69, 0.22), transparent 62%);
      }

      .eyebrow {
        letter-spacing: 0.28em;
        text-transform: uppercase;
        color: var(--teal);
        font-size: 12px;
      }

      h1 {
        margin: 12px 0 10px;
        font-family: var(--display);
        font-size: clamp(2.6rem, 4vw, 5rem);
        font-weight: 600;
        line-height: 0.96;
      }

      .hero p {
        max-width: 780px;
        margin: 0;
        color: var(--muted);
        font-size: 1rem;
      }

      .summary {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 14px;
        margin-top: 28px;
      }

      .metric {
        border: 1px solid var(--line);
        border-radius: 22px;
        padding: 16px 18px;
        background: rgba(255, 255, 255, 0.03);
        backdrop-filter: blur(14px);
      }

      .metric span {
        display: block;
        color: var(--muted);
        font-size: 12px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .metric strong {
        display: block;
        margin-top: 10px;
        font-family: var(--display);
        font-size: 2rem;
        font-weight: 600;
      }

      .filters,
      .table-shell,
      .lane-shell {
        margin-top: 22px;
        border: 1px solid var(--line);
        border-radius: 28px;
        background: var(--panel);
        box-shadow: var(--shadow);
        backdrop-filter: blur(12px);
      }

      .section-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 22px 24px 0;
      }

      .section-head h2 {
        margin: 0;
        font-family: var(--display);
        font-size: 1.8rem;
        font-weight: 600;
      }

      .section-head p {
        margin: 0;
        color: var(--muted);
        font-size: 0.95rem;
      }

      .filters-grid {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 14px;
        padding: 22px 24px 24px;
      }

      label {
        display: grid;
        gap: 8px;
        color: var(--muted);
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      input,
      select {
        width: 100%;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 16px;
        padding: 14px 14px;
        color: var(--text);
        background: rgba(8, 12, 18, 0.86);
        font: inherit;
        outline: none;
      }

      input:focus,
      select:focus {
        border-color: rgba(137, 240, 221, 0.55);
        box-shadow: 0 0 0 3px rgba(137, 240, 221, 0.12);
      }

      .lane-grid {
        display: grid;
        grid-template-columns: repeat(5, minmax(260px, 1fr));
        gap: 14px;
        padding: 22px 24px 24px;
        overflow-x: auto;
      }

      .lane {
        min-height: 280px;
        border: 1px solid var(--line);
        border-radius: 24px;
        padding: 16px;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(9, 13, 19, 0.8));
      }

      .lane header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }

      .lane header strong {
        font-size: 0.9rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--text);
      }

      .lane header span {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 30px;
        height: 30px;
        border-radius: 999px;
        background: var(--accent-soft);
        color: var(--accent);
        font-weight: 700;
      }

      .task-card {
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 20px;
        padding: 14px;
        margin-top: 12px;
        background: rgba(7, 11, 17, 0.92);
        transition: transform 180ms ease, border-color 180ms ease, background 180ms ease;
      }

      .task-card:hover {
        transform: translateY(-2px);
        border-color: rgba(255, 122, 69, 0.32);
        background: rgba(10, 15, 23, 0.96);
      }

      .task-card h3 {
        margin: 0 0 8px;
        font-size: 1rem;
      }

      .task-meta,
      .task-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .task-meta {
        margin-bottom: 10px;
        color: var(--muted);
        font-size: 0.85rem;
      }

      .pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border-radius: 999px;
        padding: 6px 10px;
        font-size: 0.72rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        background: rgba(255, 255, 255, 0.06);
      }

      .pill[data-tone="accent"] {
        background: rgba(255, 122, 69, 0.14);
        color: #ffb38f;
      }

      .pill[data-tone="teal"] {
        background: rgba(137, 240, 221, 0.14);
        color: var(--teal);
      }

      .pill[data-tone="lime"] {
        background: rgba(212, 245, 106, 0.14);
        color: var(--lime);
      }

      .pill[data-tone="rose"] {
        background: rgba(255, 158, 158, 0.14);
        color: var(--rose);
      }

      .pill[data-tone="amber"] {
        background: rgba(248, 198, 107, 0.14);
        color: var(--amber);
      }

      .table-shell {
        overflow: hidden;
      }

      .table-scroll {
        overflow: auto;
        padding: 12px 24px 24px;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        min-width: 980px;
      }

      th,
      td {
        padding: 14px 10px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        text-align: left;
        vertical-align: top;
      }

      th {
        color: var(--muted);
        font-size: 0.78rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }

      td strong {
        display: block;
        margin-bottom: 4px;
      }

      .mission-ref {
        color: var(--muted);
        font-size: 0.84rem;
      }

      .empty {
        padding: 28px 24px 30px;
        color: var(--muted);
      }

      .footer-note {
        margin-top: 14px;
        color: var(--muted);
        font-size: 0.9rem;
      }

      @media (max-width: 1100px) {
        .summary,
        .filters-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 720px) {
        .shell {
          width: min(100vw - 20px, 100%);
          padding-top: 18px;
        }

        .hero,
        .filters,
        .lane-shell,
        .table-shell {
          border-radius: 22px;
        }

        .summary,
        .filters-grid {
          grid-template-columns: 1fr;
        }

        .section-head {
          display: block;
        }

        .section-head p {
          margin-top: 8px;
        }

        .lane-grid {
          grid-template-columns: repeat(5, minmax(280px, 1fr));
        }
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <section class="hero">
        <div class="eyebrow">GMV AI Company</div>
        <h1>Task Control Room</h1>
        <p>
          Painel operacional para acompanhar todas as tasks do runtime, o status
          real de execucao e qual agente esta responsavel por cada entrega.
        </p>
        <div class="summary" id="summary"></div>
      </section>

      <section class="filters">
        <div class="section-head">
          <div>
            <h2>Filters</h2>
            <p>Busque por titulo, setor, status e responsavel sem sair do runtime.</p>
          </div>
        </div>
        <div class="filters-grid">
          <label>
            Search
            <input id="search" type="search" placeholder="Ex.: landing page, brand review" />
          </label>
          <label>
            Sector
            <select id="sector"></select>
          </label>
          <label>
            Responsible Agent
            <select id="owner"></select>
          </label>
          <label>
            Planning Status
            <select id="planning"></select>
          </label>
          <label>
            Execution Status
            <select id="execution"></select>
          </label>
        </div>
      </section>

      <section class="lane-shell">
        <div class="section-head">
          <div>
            <h2>Status Board</h2>
            <p>Leitura rapida por estado operacional, com foco em bloqueios e validacao.</p>
          </div>
        </div>
        <div class="lane-grid" id="lanes"></div>
      </section>

      <section class="table-shell">
        <div class="section-head">
          <div>
            <h2>All Tasks</h2>
            <p>Vista tabular completa para auditoria, follow-up e handoff executivo.</p>
          </div>
        </div>
        <div class="table-scroll" id="table-root"></div>
      </section>

      <p class="footer-note" id="generated-at"></p>
    </main>

    <script>
      const state = {
        dataset: null,
        filters: {
          search: "",
          sector: "",
          owner: "",
          planning: "",
          execution: ""
        }
      };

      const summaryRoot = document.getElementById("summary");
      const lanesRoot = document.getElementById("lanes");
      const tableRoot = document.getElementById("table-root");
      const generatedAtRoot = document.getElementById("generated-at");

      const laneDefinitions = [
        { key: "ready", label: "Ready" },
        { key: "queued", label: "Queued" },
        { key: "running", label: "Running" },
        { key: "waiting_validation", label: "Waiting Validation" },
        { key: "blocked", label: "Blocked" },
        { key: "completed", label: "Completed" }
      ];

      const tones = {
        critical: "rose",
        high: "accent",
        medium: "amber",
        low: "teal",
        passed: "lime",
        warning: "amber",
        failed: "rose",
        pending: "accent",
        not_required: "teal"
      };

      async function loadDashboard() {
        const response = await fetch("/api/tasks");

        if (!response.ok) {
          throw new Error("Nao foi possivel carregar o dashboard de tasks.");
        }

        state.dataset = await response.json();
        hydrateFilters(state.dataset.items);
        render();
      }

      function hydrateFilters(items) {
        fillSelect(
          document.getElementById("sector"),
          "All sectors",
          unique(items.map((item) => item.sector))
        );
        fillSelect(
          document.getElementById("owner"),
          "All owners",
          unique(
            items
              .map((item) => item.ownerAgentSlug || item.ownerAgentName)
              .filter(Boolean)
          )
        );
        fillSelect(
          document.getElementById("planning"),
          "All planning states",
          unique(items.map((item) => item.planningStatus))
        );
        fillSelect(
          document.getElementById("execution"),
          "All execution states",
          unique(items.map((item) => item.executionStatus))
        );
      }

      function fillSelect(element, placeholder, values) {
        const options = ['<option value="">' + placeholder + '</option>']
          .concat(values.map((value) => '<option value="' + escapeHtml(value) + '">' + prettify(value) + '</option>'));

        element.innerHTML = options.join("");
      }

      function unique(values) {
        return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
      }

      function applyFilters(items) {
        return items.filter((item) => {
          if (state.filters.search) {
            const haystack = [
              item.title,
              item.missionTitle,
              item.ownerAgentName,
              item.ownerAgentSlug,
              item.sector
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

            if (!haystack.includes(state.filters.search.toLowerCase())) {
              return false;
            }
          }

          if (state.filters.sector && item.sector !== state.filters.sector) {
            return false;
          }

          if (
            state.filters.owner &&
            item.ownerAgentSlug !== state.filters.owner &&
            item.ownerAgentName !== state.filters.owner
          ) {
            return false;
          }

          if (
            state.filters.planning &&
            item.planningStatus !== state.filters.planning
          ) {
            return false;
          }

          if (
            state.filters.execution &&
            item.executionStatus !== state.filters.execution
          ) {
            return false;
          }

          return true;
        });
      }

      function render() {
        if (!state.dataset) {
          return;
        }

        const items = applyFilters(state.dataset.items);
        renderSummary(items);
        renderLanes(items);
        renderTable(items);
        generatedAtRoot.textContent =
          "Generated at " + new Date(state.dataset.generatedAt).toLocaleString("pt-BR");
      }

      function renderSummary(items) {
        const summary = {
          total: items.length,
          running: items.filter((item) => item.executionStatus === "running").length,
          blocked: items.filter((item) => item.executionStatus === "blocked").length,
          waitingValidation: items.filter((item) => laneKeyFor(item) === "waiting_validation").length,
          completed: items.filter((item) => item.executionStatus === "completed").length,
          owners: new Set(items.map((item) => item.ownerAgentName)).size
        };

        summaryRoot.innerHTML = [
          metric("Visible tasks", summary.total),
          metric("Running", summary.running),
          metric("Blocked", summary.blocked),
          metric("Waiting validation", summary.waitingValidation),
          metric("Completed", summary.completed),
          metric("Owners on duty", summary.owners)
        ].join("");
      }

      function metric(label, value) {
        return '<article class="metric"><span>' + label + '</span><strong>' + value + "</strong></article>";
      }

      function renderLanes(items) {
        if (items.length === 0) {
          lanesRoot.innerHTML = '<div class="empty">Nenhuma task encontrada para os filtros atuais.</div>';
          return;
        }

        lanesRoot.innerHTML = laneDefinitions
          .map((lane) => {
            const laneItems = items.filter((item) => laneKeyFor(item) === lane.key);

            return '<section class="lane">' +
              '<header><strong>' + lane.label + '</strong><span>' + laneItems.length + "</span></header>" +
              (laneItems.length === 0
                ? '<div class="empty">Sem tasks neste estado.</div>'
                : laneItems.map(renderCard).join("")) +
              "</section>";
          })
          .join("");
      }

      function renderCard(item) {
        return '<article class="task-card">' +
          "<h3>" + escapeHtml(item.title) + "</h3>" +
          '<div class="task-meta">' +
            "<span>" + escapeHtml(item.missionTitle) + "</span>" +
            "<span>•</span>" +
            "<span>" + escapeHtml(prettify(item.ownerAgentName)) + "</span>" +
          "</div>" +
          '<div class="task-tags">' +
            pill(item.priority, tones[item.priority] || "accent") +
            pill(item.sector, "teal") +
            pill(prettify(item.executionStatus), "accent") +
            pill(prettify(item.validationState), tones[item.validationState] || "teal") +
          "</div>" +
        "</article>";
      }

      function renderTable(items) {
        if (items.length === 0) {
          tableRoot.innerHTML = '<div class="empty">Nenhuma task visivel com os filtros selecionados.</div>';
          return;
        }

        tableRoot.innerHTML =
          "<table>" +
            "<thead>" +
              "<tr>" +
                "<th>Task</th>" +
                "<th>Mission</th>" +
                "<th>Sector</th>" +
                "<th>Responsible</th>" +
                "<th>Planning</th>" +
                "<th>Execution</th>" +
                "<th>Validation</th>" +
                "<th>Signals</th>" +
              "</tr>" +
            "</thead>" +
            "<tbody>" +
              items.map((item) => {
                return "<tr>" +
                  "<td><strong>" + escapeHtml(item.title) + "</strong><span class=\\"mission-ref\\">" + escapeHtml(item.id) + "</span></td>" +
                  "<td>" + escapeHtml(item.missionTitle) + "</td>" +
                  "<td>" + pill(item.sector, "teal") + "</td>" +
                  "<td>" + escapeHtml(item.ownerAgentName) + "</td>" +
                  "<td>" + pill(prettify(item.planningStatus), "amber") + "</td>" +
                  "<td>" + pill(prettify(item.executionStatus), "accent") + "</td>" +
                  "<td>" + pill(prettify(item.validationState), tones[item.validationState] || "teal") + "</td>" +
                  "<td>" +
                    '<div class="task-tags">' +
                      pill(item.pendingApprovals + " approvals", item.pendingApprovals > 0 ? "rose" : "teal") +
                      pill(item.openHandoffs + " handoffs", item.openHandoffs > 0 ? "amber" : "teal") +
                    "</div>" +
                  "</td>" +
                "</tr>";
              }).join("") +
            "</tbody>" +
          "</table>";
      }

      function laneKeyFor(item) {
        if (item.executionStatus === "completed") {
          return "completed";
        }

        if (item.executionStatus === "blocked") {
          return "blocked";
        }

        if (item.executionStatus === "running") {
          return "running";
        }

        if (item.executionStatus === "queued") {
          return "queued";
        }

        if (
          item.planningStatus === "waiting_validation" ||
          item.validationState === "pending"
        ) {
          return "waiting_validation";
        }

        return "ready";
      }

      function pill(label, tone) {
        return '<span class="pill" data-tone="' + tone + '">' + escapeHtml(label) + "</span>";
      }

      function prettify(value) {
        return String(value).replaceAll("_", " ");
      }

      function escapeHtml(value) {
        return String(value)
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;")
          .replaceAll("'", "&#39;");
      }

      document.getElementById("search").addEventListener("input", (event) => {
        state.filters.search = event.target.value;
        render();
      });

      document.getElementById("sector").addEventListener("change", (event) => {
        state.filters.sector = event.target.value;
        render();
      });

      document.getElementById("owner").addEventListener("change", (event) => {
        state.filters.owner = event.target.value;
        render();
      });

      document.getElementById("planning").addEventListener("change", (event) => {
        state.filters.planning = event.target.value;
        render();
      });

      document.getElementById("execution").addEventListener("change", (event) => {
        state.filters.execution = event.target.value;
        render();
      });

      loadDashboard().catch((error) => {
        summaryRoot.innerHTML = '<article class="metric"><span>Dashboard error</span><strong>!</strong></article>';
        lanesRoot.innerHTML = '<div class="empty">' + escapeHtml(error.message) + "</div>";
        tableRoot.innerHTML = '<div class="empty">Verifique se o runtime possui tasks carregadas.</div>';
      });
    </script>
  </body>
</html>`;
}
