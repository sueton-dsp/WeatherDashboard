// ============================================
// Fertigungs-Dashboard – Hauptlogik
// ============================================

const App = {
    openData: [],
    doneData: [],
    charts: {},
    userUploadedOpen: false,
    userUploadedDone: false,

    // --- Initialisierung ---
    init() {
        this.initTheme();
        this.initFileInputs();
        this.initSearch();
        this.loadSampleData();
    },

    // --- Theme ---
    initTheme() {
        const saved = localStorage.getItem('dashboard_theme') || 'dark';
        document.documentElement.setAttribute('data-theme', saved);

        document.getElementById('theme-toggle').addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('dashboard_theme', next);
            this.updateChartColors();
        });
    },

    // --- File Upload ---
    initFileInputs() {
        document.getElementById('file-open').addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.parseCSVFile(e.target.files[0], (data) => {
                    this.openData = data;
                    this.userUploadedOpen = true;
                    this.refresh();
                });
            }
        });

        document.getElementById('file-done').addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.parseCSVFile(e.target.files[0], (data) => {
                    this.doneData = data;
                    this.userUploadedDone = true;
                    this.refresh();
                });
            }
        });
    },

    // --- Suche ---
    initSearch() {
        document.getElementById('search-open').addEventListener('input', (e) => {
            this.renderTable('tbody-open', this.openData, 'open', e.target.value);
        });
        document.getElementById('search-done').addEventListener('input', (e) => {
            this.renderTable('tbody-done', this.doneData, 'done', e.target.value);
        });
    },

    // --- CSV-Parsing ---
    parseCSVFile(file, callback) {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            delimiter: '',  // auto-detect
            complete: (results) => {
                callback(results.data);
            },
            error: (err) => {
                console.error('CSV-Fehler:', err);
                alert('Fehler beim Lesen der CSV-Datei: ' + err.message);
            }
        });
    },

    parseCSVString(csvText) {
        const result = Papa.parse(csvText.trim(), {
            header: true,
            skipEmptyLines: true,
            delimiter: '',  // auto-detect
        });
        return result.data;
    },

    // --- Beispieldaten laden ---
    loadSampleData() {
        this.openData = this.parseCSVString(SAMPLE_DATA.open);
        this.doneData = this.parseCSVString(SAMPLE_DATA.done);
        this.refresh();
    },

    // --- Dashboard aktualisieren ---
    refresh() {
        const infoBar = document.getElementById('info-bar');
        if (this.userUploadedOpen && this.userUploadedDone) {
            infoBar.hidden = true;
        } else if (this.userUploadedOpen || this.userUploadedDone) {
            infoBar.textContent = 'Teils eigene Daten geladen. Lade auch die zweite CSV-Datei hoch.';
            infoBar.hidden = false;
        } else {
            infoBar.textContent = 'Beispieldaten geladen. Eigene CSV-Dateien oben hochladen, um deine Daten anzuzeigen.';
            infoBar.hidden = false;
        }

        this.updateKPIs();
        this.updateCharts();
        this.renderTable('tbody-open', this.openData, 'open', document.getElementById('search-open').value);
        this.renderTable('tbody-done', this.doneData, 'done', document.getElementById('search-done').value);
    },

    // --- KPIs ---
    updateKPIs() {
        const allOrders = new Set();
        this.openData.forEach(r => allOrders.add(r.Auftragsnr));
        this.doneData.forEach(r => allOrders.add(r.Auftragsnr));

        const openCount = this.openData.length;
        const doneCount = this.doneData.length;

        // Ausschussquote
        let totalSoll = 0;
        let totalAusschuss = 0;
        this.doneData.forEach(r => {
            totalSoll += Number(r.Sollmenge) || 0;
            totalAusschuss += Number(r.Ausschuss) || 0;
        });
        const scrapRate = totalSoll > 0 ? ((totalAusschuss / totalSoll) * 100).toFixed(1) : '0.0';

        // Mengenerfullung (Ist / Soll)
        let totalIst = 0;
        this.doneData.forEach(r => {
            totalIst += Number(r.Istmenge) || 0;
        });
        const completionRate = totalSoll > 0 ? ((totalIst / totalSoll) * 100).toFixed(1) : '0.0';

        document.getElementById('kpi-total-orders').textContent = allOrders.size;
        document.getElementById('kpi-open-ops').textContent = openCount;
        document.getElementById('kpi-done-ops').textContent = doneCount;
        document.getElementById('kpi-scrap-rate').textContent = scrapRate + '%';
        document.getElementById('kpi-completion-rate').textContent = completionRate + '%';
    },

    // --- Tabellen ---
    renderTable(tbodyId, data, type, searchTerm) {
        const tbody = document.getElementById(tbodyId);
        const term = (searchTerm || '').toLowerCase();

        const filtered = term
            ? data.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(term)))
            : data;

        tbody.innerHTML = filtered.map(r => {
            if (type === 'open') {
                return `<tr>
                    <td>${this.esc(r.Auftragsnr)}</td>
                    <td>${this.esc(r.Material)}</td>
                    <td>${this.esc(r.Bezeichnung)}</td>
                    <td>${this.esc(r.AG_Bezeichnung)}</td>
                    <td>${this.esc(r.Arbeitsplatz)}</td>
                    <td>${this.formatDate(r.Planstart)}</td>
                    <td>${this.formatDate(r.Planende)}</td>
                    <td>${this.esc(r.Sollmenge)}</td>
                    <td>${this.esc(r.Rueckmeldung)}</td>
                    <td>${this.statusBadge(r.Status)}</td>
                </tr>`;
            } else {
                return `<tr>
                    <td>${this.esc(r.Auftragsnr)}</td>
                    <td>${this.esc(r.Material)}</td>
                    <td>${this.esc(r.Bezeichnung)}</td>
                    <td>${this.esc(r.AG_Bezeichnung)}</td>
                    <td>${this.esc(r.Arbeitsplatz)}</td>
                    <td>${this.formatDate(r.Iststart)}</td>
                    <td>${this.formatDate(r.Istende)}</td>
                    <td>${this.esc(r.Sollmenge)}</td>
                    <td>${this.esc(r.Istmenge)}</td>
                    <td>${this.esc(r.Ausschuss)}</td>
                </tr>`;
            }
        }).join('');
    },

    esc(val) {
        if (val == null) return '';
        const div = document.createElement('div');
        div.textContent = String(val);
        return div.innerHTML;
    },

    formatDate(dateStr) {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
        return this.esc(dateStr);
    },

    statusBadge(status) {
        if (!status) return '';
        const s = status.trim();
        if (s === 'In Bearbeitung') return `<span class="badge badge--orange">${this.esc(s)}</span>`;
        if (s === 'Freigegeben') return `<span class="badge badge--blue">${this.esc(s)}</span>`;
        if (s === 'Abgeschlossen') return `<span class="badge badge--green">${this.esc(s)}</span>`;
        return `<span class="badge badge--gray">${this.esc(s)}</span>`;
    },

    // --- Charts ---
    getChartColors() {
        const style = getComputedStyle(document.documentElement);
        return {
            text: style.getPropertyValue('--text-muted').trim(),
            border: style.getPropertyValue('--border').trim(),
            blue: style.getPropertyValue('--blue').trim(),
            green: style.getPropertyValue('--green').trim(),
            orange: style.getPropertyValue('--orange').trim(),
            red: style.getPropertyValue('--red').trim(),
            purple: style.getPropertyValue('--purple').trim(),
            accent: style.getPropertyValue('--accent').trim(),
        };
    },

    updateCharts() {
        const c = this.getChartColors();

        // Chart-Defaults
        Chart.defaults.color = c.text;
        Chart.defaults.borderColor = c.border;
        Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';

        this.renderStatusChart(c);
        this.renderWorkcenterChart(c);
        this.renderTimelineChart(c);
        this.renderQuantityChart(c);
    },

    updateChartColors() {
        // Alle Charts mit neuen Farben neu rendern
        Object.values(this.charts).forEach(ch => ch.destroy());
        this.charts = {};
        this.updateCharts();
    },

    renderStatusChart(c) {
        if (this.charts.status) this.charts.status.destroy();

        const counts = {};
        this.openData.forEach(r => {
            const s = (r.Status || 'Unbekannt').trim();
            counts[s] = (counts[s] || 0) + 1;
        });

        const labels = Object.keys(counts);
        const values = Object.values(counts);
        const colors = labels.map(l => {
            if (l === 'In Bearbeitung') return c.orange;
            if (l === 'Freigegeben') return c.blue;
            if (l === 'Wartend') return c.text;
            return c.purple;
        });

        this.charts.status = new Chart(document.getElementById('chart-status'), {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors.map(col => col + '33'),
                    borderColor: colors,
                    borderWidth: 2,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true } },
                }
            }
        });
    },

    renderWorkcenterChart(c) {
        if (this.charts.workcenters) this.charts.workcenters.destroy();

        const openCounts = {};
        const doneCounts = {};

        this.openData.forEach(r => {
            const wp = r.Arbeitsplatz || 'Unbekannt';
            openCounts[wp] = (openCounts[wp] || 0) + 1;
        });
        this.doneData.forEach(r => {
            const wp = r.Arbeitsplatz || 'Unbekannt';
            doneCounts[wp] = (doneCounts[wp] || 0) + 1;
        });

        const allWP = [...new Set([...Object.keys(openCounts), ...Object.keys(doneCounts)])].sort();

        this.charts.workcenters = new Chart(document.getElementById('chart-workcenters'), {
            type: 'bar',
            data: {
                labels: allWP,
                datasets: [
                    {
                        label: 'Offen',
                        data: allWP.map(wp => openCounts[wp] || 0),
                        backgroundColor: c.orange + '66',
                        borderColor: c.orange,
                        borderWidth: 1,
                    },
                    {
                        label: 'Beendet',
                        data: allWP.map(wp => doneCounts[wp] || 0),
                        backgroundColor: c.green + '66',
                        borderColor: c.green,
                        borderWidth: 1,
                    },
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top', labels: { usePointStyle: true, padding: 12 } } },
                scales: {
                    x: { grid: { display: false } },
                    y: { beginAtZero: true, ticks: { stepSize: 1 } },
                }
            }
        });
    },

    renderTimelineChart(c) {
        if (this.charts.timeline) this.charts.timeline.destroy();

        // Beendete AG nach Istende-Datum gruppieren
        const dateCounts = {};
        this.doneData.forEach(r => {
            const d = r.Istende || '';
            if (d) dateCounts[d] = (dateCounts[d] || 0) + 1;
        });

        const sorted = Object.keys(dateCounts).sort();

        this.charts.timeline = new Chart(document.getElementById('chart-timeline'), {
            type: 'line',
            data: {
                labels: sorted.map(d => this.formatDate(d)),
                datasets: [{
                    label: 'Beendete AG',
                    data: sorted.map(d => dateCounts[d]),
                    borderColor: c.accent,
                    backgroundColor: c.accent + '22',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false } },
                    y: { beginAtZero: true, ticks: { stepSize: 1 } },
                }
            }
        });
    },

    renderQuantityChart(c) {
        if (this.charts.quantities) this.charts.quantities.destroy();

        // Pro Fertigungsauftrag: Soll vs Ist (aggregiert ueber alle AG)
        const orders = {};
        this.doneData.forEach(r => {
            const key = r.Auftragsnr || 'Unbekannt';
            if (!orders[key]) orders[key] = { soll: 0, ist: 0 };
            orders[key].soll += Number(r.Sollmenge) || 0;
            orders[key].ist += Number(r.Istmenge) || 0;
        });

        const labels = Object.keys(orders).sort();

        this.charts.quantities = new Chart(document.getElementById('chart-quantities'), {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Soll',
                        data: labels.map(k => orders[k].soll),
                        backgroundColor: c.blue + '66',
                        borderColor: c.blue,
                        borderWidth: 1,
                    },
                    {
                        label: 'Ist',
                        data: labels.map(k => orders[k].ist),
                        backgroundColor: c.green + '66',
                        borderColor: c.green,
                        borderWidth: 1,
                    },
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top', labels: { usePointStyle: true, padding: 12 } } },
                scales: {
                    x: { grid: { display: false } },
                    y: { beginAtZero: true },
                }
            }
        });
    },
};

// ============================================
// Eingebettete Beispieldaten
// ============================================
const SAMPLE_DATA = {
    open: `Auftragsnr;Material;Bezeichnung;Arbeitsgang;AG_Bezeichnung;Arbeitsplatz;Planstart;Planende;Sollmenge;Rueckmeldung;Status
FA-2025-0112;MAT-3001;Gehaeuse Typ A;0010;Drehen;CNC-01;2025-02-10;2025-02-11;200;0;Freigegeben
FA-2025-0112;MAT-3001;Gehaeuse Typ A;0020;Fraesen;FRAES-01;2025-02-11;2025-02-12;200;0;Wartend
FA-2025-0112;MAT-3001;Gehaeuse Typ A;0030;Qualitaetspruefung;QUAL-01;2025-02-12;2025-02-13;200;0;Wartend
FA-2025-0113;MAT-3002;Welle 50mm;0010;Drehen;CNC-02;2025-02-10;2025-02-11;150;80;In Bearbeitung
FA-2025-0113;MAT-3002;Welle 50mm;0020;Schleifen;SCHLEIF-01;2025-02-11;2025-02-12;150;0;Wartend
FA-2025-0114;MAT-3003;Flansch DN100;0010;Drehen;CNC-01;2025-02-12;2025-02-13;75;0;Freigegeben
FA-2025-0114;MAT-3003;Flansch DN100;0020;Bohren;BOHR-01;2025-02-13;2025-02-14;75;0;Wartend
FA-2025-0114;MAT-3003;Flansch DN100;0030;Montage;MONT-01;2025-02-14;2025-02-15;75;0;Wartend
FA-2025-0115;MAT-3004;Deckel Variante B;0010;Fraesen;FRAES-01;2025-02-11;2025-02-12;300;120;In Bearbeitung
FA-2025-0115;MAT-3004;Deckel Variante B;0020;Entgraten;ENTGR-01;2025-02-12;2025-02-13;300;0;Wartend
FA-2025-0115;MAT-3004;Deckel Variante B;0030;Lackieren;LACK-01;2025-02-13;2025-02-14;300;0;Wartend
FA-2025-0116;MAT-3005;Zahnrad M2;0010;Fraesen;FRAES-02;2025-02-13;2025-02-14;500;0;Freigegeben
FA-2025-0116;MAT-3005;Zahnrad M2;0020;Haerten;HAERT-01;2025-02-14;2025-02-15;500;0;Wartend
FA-2025-0116;MAT-3005;Zahnrad M2;0030;Schleifen;SCHLEIF-01;2025-02-15;2025-02-16;500;0;Wartend
FA-2025-0117;MAT-3006;Bolzen 8x40;0010;Drehen;CNC-03;2025-02-10;2025-02-10;1000;650;In Bearbeitung
FA-2025-0118;MAT-3007;Lagerdeckel;0010;Drehen;CNC-02;2025-02-14;2025-02-15;120;0;Freigegeben
FA-2025-0118;MAT-3007;Lagerdeckel;0020;Bohren;BOHR-01;2025-02-15;2025-02-16;120;0;Wartend
FA-2025-0118;MAT-3007;Lagerdeckel;0030;Montage;MONT-02;2025-02-16;2025-02-17;120;0;Wartend
FA-2025-0119;MAT-3008;Konsole Stahl;0010;Schneiden;SCHNEID-01;2025-02-12;2025-02-12;80;80;In Bearbeitung
FA-2025-0119;MAT-3008;Konsole Stahl;0020;Schweissen;SCHWEISS-01;2025-02-13;2025-02-14;80;0;Wartend
FA-2025-0119;MAT-3008;Konsole Stahl;0030;Lackieren;LACK-01;2025-02-14;2025-02-15;80;0;Wartend
FA-2025-0120;MAT-3009;Adapter DN50;0010;Drehen;CNC-01;2025-02-15;2025-02-16;60;0;Freigegeben
FA-2025-0120;MAT-3009;Adapter DN50;0020;Qualitaetspruefung;QUAL-01;2025-02-16;2025-02-17;60;0;Wartend
FA-2025-0121;MAT-3010;Distanzhuelse;0010;Drehen;CNC-03;2025-02-13;2025-02-13;400;0;Freigegeben
FA-2025-0121;MAT-3010;Distanzhuelse;0020;Entgraten;ENTGR-01;2025-02-14;2025-02-14;400;0;Wartend
FA-2025-0122;MAT-3011;Grundplatte 200x300;0010;Fraesen;FRAES-01;2025-02-14;2025-02-15;40;15;In Bearbeitung
FA-2025-0122;MAT-3011;Grundplatte 200x300;0020;Bohren;BOHR-01;2025-02-15;2025-02-16;40;0;Wartend
FA-2025-0122;MAT-3011;Grundplatte 200x300;0030;Qualitaetspruefung;QUAL-01;2025-02-16;2025-02-17;40;0;Wartend
FA-2025-0123;MAT-3012;Spannring;0010;Drehen;CNC-02;2025-02-15;2025-02-16;250;0;Freigegeben
FA-2025-0123;MAT-3012;Spannring;0020;Haerten;HAERT-01;2025-02-16;2025-02-17;250;0;Wartend`,

    done: `Auftragsnr;Material;Bezeichnung;Arbeitsgang;AG_Bezeichnung;Arbeitsplatz;Planstart;Planende;Iststart;Istende;Sollmenge;Istmenge;Ausschuss;Status
FA-2025-0100;MAT-3001;Gehaeuse Typ A;0010;Drehen;CNC-01;2025-01-06;2025-01-07;2025-01-06;2025-01-07;100;98;2;Abgeschlossen
FA-2025-0100;MAT-3001;Gehaeuse Typ A;0020;Fraesen;FRAES-01;2025-01-07;2025-01-08;2025-01-07;2025-01-08;100;97;1;Abgeschlossen
FA-2025-0100;MAT-3001;Gehaeuse Typ A;0030;Qualitaetspruefung;QUAL-01;2025-01-08;2025-01-09;2025-01-08;2025-01-09;100;97;0;Abgeschlossen
FA-2025-0101;MAT-3002;Welle 50mm;0010;Drehen;CNC-02;2025-01-08;2025-01-09;2025-01-08;2025-01-09;200;200;0;Abgeschlossen
FA-2025-0101;MAT-3002;Welle 50mm;0020;Schleifen;SCHLEIF-01;2025-01-09;2025-01-10;2025-01-09;2025-01-11;200;198;2;Abgeschlossen
FA-2025-0102;MAT-3005;Zahnrad M2;0010;Fraesen;FRAES-02;2025-01-10;2025-01-11;2025-01-10;2025-01-11;400;395;5;Abgeschlossen
FA-2025-0102;MAT-3005;Zahnrad M2;0020;Haerten;HAERT-01;2025-01-11;2025-01-12;2025-01-11;2025-01-13;400;395;0;Abgeschlossen
FA-2025-0102;MAT-3005;Zahnrad M2;0030;Schleifen;SCHLEIF-01;2025-01-13;2025-01-14;2025-01-13;2025-01-14;400;393;2;Abgeschlossen
FA-2025-0103;MAT-3006;Bolzen 8x40;0010;Drehen;CNC-03;2025-01-13;2025-01-13;2025-01-13;2025-01-13;2000;2000;0;Abgeschlossen
FA-2025-0104;MAT-3003;Flansch DN100;0010;Drehen;CNC-01;2025-01-14;2025-01-15;2025-01-14;2025-01-15;50;49;1;Abgeschlossen
FA-2025-0104;MAT-3003;Flansch DN100;0020;Bohren;BOHR-01;2025-01-15;2025-01-16;2025-01-15;2025-01-16;50;49;0;Abgeschlossen
FA-2025-0104;MAT-3003;Flansch DN100;0030;Montage;MONT-01;2025-01-16;2025-01-17;2025-01-16;2025-01-17;50;49;0;Abgeschlossen
FA-2025-0105;MAT-3004;Deckel Variante B;0010;Fraesen;FRAES-01;2025-01-15;2025-01-16;2025-01-15;2025-01-16;250;248;2;Abgeschlossen
FA-2025-0105;MAT-3004;Deckel Variante B;0020;Entgraten;ENTGR-01;2025-01-16;2025-01-17;2025-01-16;2025-01-17;250;248;0;Abgeschlossen
FA-2025-0105;MAT-3004;Deckel Variante B;0030;Lackieren;LACK-01;2025-01-17;2025-01-18;2025-01-17;2025-01-19;250;246;2;Abgeschlossen
FA-2025-0106;MAT-3008;Konsole Stahl;0010;Schneiden;SCHNEID-01;2025-01-17;2025-01-17;2025-01-17;2025-01-17;100;100;0;Abgeschlossen
FA-2025-0106;MAT-3008;Konsole Stahl;0020;Schweissen;SCHWEISS-01;2025-01-18;2025-01-19;2025-01-18;2025-01-20;100;99;1;Abgeschlossen
FA-2025-0106;MAT-3008;Konsole Stahl;0030;Lackieren;LACK-01;2025-01-20;2025-01-21;2025-01-20;2025-01-21;100;99;0;Abgeschlossen
FA-2025-0107;MAT-3009;Adapter DN50;0010;Drehen;CNC-01;2025-01-20;2025-01-21;2025-01-20;2025-01-21;80;80;0;Abgeschlossen
FA-2025-0107;MAT-3009;Adapter DN50;0020;Qualitaetspruefung;QUAL-01;2025-01-21;2025-01-22;2025-01-21;2025-01-22;80;78;2;Abgeschlossen
FA-2025-0108;MAT-3010;Distanzhuelse;0010;Drehen;CNC-03;2025-01-22;2025-01-22;2025-01-22;2025-01-22;500;500;0;Abgeschlossen
FA-2025-0108;MAT-3010;Distanzhuelse;0020;Entgraten;ENTGR-01;2025-01-23;2025-01-23;2025-01-23;2025-01-23;500;498;2;Abgeschlossen
FA-2025-0109;MAT-3011;Grundplatte 200x300;0010;Fraesen;FRAES-01;2025-01-23;2025-01-24;2025-01-23;2025-01-24;30;30;0;Abgeschlossen
FA-2025-0109;MAT-3011;Grundplatte 200x300;0020;Bohren;BOHR-01;2025-01-24;2025-01-25;2025-01-24;2025-01-25;30;30;0;Abgeschlossen
FA-2025-0109;MAT-3011;Grundplatte 200x300;0030;Qualitaetspruefung;QUAL-01;2025-01-25;2025-01-26;2025-01-25;2025-01-26;30;29;1;Abgeschlossen
FA-2025-0110;MAT-3012;Spannring;0010;Drehen;CNC-02;2025-01-27;2025-01-28;2025-01-27;2025-01-28;300;298;2;Abgeschlossen
FA-2025-0110;MAT-3012;Spannring;0020;Haerten;HAERT-01;2025-01-28;2025-01-29;2025-01-28;2025-01-30;300;297;1;Abgeschlossen
FA-2025-0111;MAT-3007;Lagerdeckel;0010;Drehen;CNC-02;2025-01-29;2025-01-30;2025-01-29;2025-01-30;150;150;0;Abgeschlossen
FA-2025-0111;MAT-3007;Lagerdeckel;0020;Bohren;BOHR-01;2025-01-30;2025-01-31;2025-01-30;2025-01-31;150;148;2;Abgeschlossen
FA-2025-0111;MAT-3007;Lagerdeckel;0030;Montage;MONT-02;2025-01-31;2025-02-01;2025-01-31;2025-02-01;150;148;0;Abgeschlossen
FA-2025-0098;MAT-3013;Passfeder 8x7;0010;Fraesen;FRAES-02;2025-01-06;2025-01-06;2025-01-06;2025-01-06;800;800;0;Abgeschlossen
FA-2025-0098;MAT-3013;Passfeder 8x7;0020;Qualitaetspruefung;QUAL-01;2025-01-07;2025-01-07;2025-01-07;2025-01-07;800;795;5;Abgeschlossen
FA-2025-0099;MAT-3014;Buchse 25x30;0010;Drehen;CNC-01;2025-01-08;2025-01-09;2025-01-08;2025-01-09;350;348;2;Abgeschlossen
FA-2025-0099;MAT-3014;Buchse 25x30;0020;Schleifen;SCHLEIF-01;2025-01-09;2025-01-10;2025-01-10;2025-01-11;350;346;2;Abgeschlossen
FA-2025-0099;MAT-3014;Buchse 25x30;0030;Qualitaetspruefung;QUAL-01;2025-01-11;2025-01-12;2025-01-11;2025-01-12;350;344;2;Abgeschlossen`,
};

// App starten
document.addEventListener('DOMContentLoaded', () => App.init());
