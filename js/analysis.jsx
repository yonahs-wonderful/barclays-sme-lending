/* analysis.jsx — futuristic document-analysis loader shown in the chat the moment
   a file is uploaded, BEFORE the agent's verdict. Renders the REAL uploaded PDF
   (first page) via pdf.js inside a scanner stage: sweeping beam, grid overlay,
   corner brackets, a checklist of extraction steps, and live "extracted fields"
   read from the actual documents. The card PERSISTS after analysis (it does not
   collapse) so the work stays visible — only its status badge changes between
   Validated and Not validated (unsigned), driven by the live document state. */
const { IconDoc: AnDoc, IconCheck: AnCheck, IconShield: AnShield, IconAlert: AnAlert } = window;

const ANALYSIS_MS = 3600;

/* Per-document analysis script. Fields are the values "OCR-extracted" from the
   two uploaded PDFs (2024 management accounts + signed contract). Locale-sensitive
   bits — currency symbol, the legal-entity suffix (Ltd), and the company-identifier
   label + number (Companies House "Company number") — are brand-driven via
   window.TALDocLocale, set at boot in app.jsx, so the active brand reads with
   the correct entity identifier and currency symbol. */
function docLocale() {
  var d = window.TALDocLocale || {};
  return {
    cur: d.cur || "$",
    entity: d.entity || "Thornfield Precision Engineering Ltd",
    coLabel: d.coLabel || "Company number",
    coNumber: d.coNumber || "06249013"
  };
}

function analysisMeta() {
  var L = docLocale();
  return {
    management_accounts_2024: {
      title: "2024 management accounts",
      src: "uploads/Thornfield_2024_Management_Accounts.pdf",
      faux: "financial",
      fields: [
        { at: 1400, k: "Entity", v: L.entity },
        { at: 1850, k: "Revenue FY24", v: L.cur + "4,600,000" },
        { at: 2350, k: "EBITDA FY24", v: L.cur + "620,000" },
        { at: 2850, k: "DSCR", v: "2.1x" }
      ]
    },
    jlr_contract: {
      title: "Signed contract",
      src: "uploads/Signed_Contract.pdf",
      faux: "contract",
      fields: [
        { at: 1400, k: "Supplier", v: L.entity },
        { at: 1850, k: "Counterparty", v: "Major automotive manufacturer" },
        { at: 2350, k: "Signed value", v: L.cur + "760,000", warn: true, vOk: L.cur + "760,000 · variance reviewed" },
        { at: 2850, k: "Signature", v: "Validated" }
      ]
    }
  };
}

function analysisSteps() {
  return [
    { label: "Securing & opening file", at: 600 },
    { label: "Extracting text · OCR", at: 1350 },
    { label: "Identifying key fields", at: 2200 },
    { label: "Verifying Thornfield records", at: 2900 },
    { label: "Validating against SME credit criteria", at: 3450 }
  ];
}

const VERDICT = {
  validated: { label: "Validated", cls: "ok" },
  unsigned: { label: "Not validated · unsigned", cls: "warn" },
  pending: { label: "Analysed", cls: "neutral" }
};

/* Document-accurate facsimile shown in the scanner stage. Renders instantly
   (no pdf.js dependency) and is tailored to the document type so the scan always
   reads as THAT document. If pdf.js manages to rasterise the real page, the live
   canvas is layered on top. */
function FauxDoc({ variant }) {
  if (variant === "financial") {
    const rows = [
      ["Revenue FY22", "3,900,000"], ["Revenue FY23", "4,180,000"], ["Revenue FY24", "4,600,000"],
      ["EBITDA FY24", "620,000"], ["Net debt", "410,000"],
      ["DSCR", "2.1x"], ["Current ratio", "1.6x"]
    ];
    return (
      <div className="fp fp-financial">
        <div className="fp-hd"><span className="fp-hd-dot"></span>FINANCIAL STATEMENTS</div>
        <div className="fp-sub">{docLocale().entity} · FY2024</div>
        <div className="fp-table">
          {rows.map((r, i) => (
            <div className="fp-tr" key={i}><span className="fp-k">{r[0]}</span><span className="fp-dots"></span><span className="fp-num">{r[1]}</span></div>
          ))}
        </div>
      </div>
    );
  }
  if (variant === "contract") {
    return (
      <div className="fp fp-form">
        <div className="fp-hd"><span className="fp-hd-dot"></span>SUPPLY CONTRACT</div>
        <div className="fp-sub">Major automotive manufacturer · signed agreement</div>
        <div className="fp-fields">
          {["Supplier", "Counterparty", "Contract value", "Term", "First PO window"].map((l, i) => (
            <div className="fp-field" key={i}><span className="fp-fl">{l}</span><span className="fp-fb"></span></div>
          ))}
        </div>
        <div className="fp-sigline"><span className="fp-sig">James Thornfield</span></div>
      </div>
    );
  }
  return (
    <div className="fp">
      <div className="fp-band"></div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div className="fp-line" key={i} style={{ width: (96 - (i % 4) * 14) + "%" }}></div>
      ))}
    </div>
  );
}

/* Render the first page of a PDF onto a canvas, layered over a document-accurate
   facsimile. The facsimile shows immediately; if pdf.js rasterises within the
   timeout the real page is revealed on top. */
function PdfPreview({ src, w, variant }) {
  const cssW = w || 210;
  const canvasRef = React.useRef(null);
  const [ok, setOk] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    let task = null;
    const timer = setTimeout(() => { if (task) { try { task.destroy(); } catch (e) {} } }, 3000);
    async function render() {
      const lib = window.pdfjsLib;
      if (!lib || !src) return;
      try {
        if (lib.GlobalWorkerOptions && !lib.GlobalWorkerOptions.workerSrc) {
          lib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        }
        task = lib.getDocument({
          url: src,
          standardFontDataUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/",
          cMapUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/",
          cMapPacked: true
        });
        const pdf = await task.promise;
        const page = await pdf.getPage(1);
        if (cancelled) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const base = page.getViewport({ scale: 1 });
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const scale = (cssW / base.width) * dpr;
        const vp = page.getViewport({ scale: scale });
        canvas.width = vp.width;
        canvas.height = vp.height;
        canvas.style.width = cssW + "px";
        canvas.style.height = (vp.height / dpr) + "px";
        await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise;
        if (!cancelled) setOk(true);
      } catch (e) { /* keep the facsimile */ }
    }
    render();
    return () => { cancelled = true; clearTimeout(timer); if (task) { try { task.destroy(); } catch (e) {} } };
  }, [src]);

  return (
    <div className={"an-paper" + (ok ? " ready" : "")}>
      <div className={"an-page" + (ok ? " ready" : "")}>
        <FauxDoc variant={variant} />
        <canvas ref={canvasRef} className="an-canvas" style={{ opacity: ok ? 1 : 0 }}></canvas>
      </div>
    </div>
  );
}

function DocAnalysis({ item, ctx, compact }) {
  const ANALYSIS_META = analysisMeta();
  const ANALYSIS_STEPS = analysisSteps();
  const meta = ANALYSIS_META[item.docId] || { title: item.filename, src: null, fields: [] };
  const done = !!item.done;
  const [elapsed, setElapsed] = React.useState(0);

  React.useEffect(() => {
    if (done) { setElapsed(ANALYSIS_MS); return; }
    const start = performance.now();
    let raf;
    const tick = () => {
      const e = performance.now() - start;
      setElapsed(e);
      if (e < ANALYSIS_MS) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [done]);

  const e = done ? ANALYSIS_MS : elapsed;
  const pct = Math.min(100, Math.round((e / ANALYSIS_MS) * 100));
  const shownFields = meta.fields.filter((f) => done || e >= f.at);

  // Live verdict — resolves AFTER the verdict turn updates the document state,
  // so the card flows: scanning → Analysed → Validated / Not validated.
  const live = (ctx && ctx.docState) ? ctx.docState(item.docId) : null;
  const status = live && live.status;
  const resolved = status === "validated";
  const verdictKey = !done ? null
    : status === "validated" ? "validated"
      : status === "issue" ? "unsigned"
        : "pending";
  const verdict = verdictKey ? VERDICT[verdictKey] : null;
  const verdictLabel = verdict ? (compact ? ({ validated: "Validated", unsigned: "Unsigned", pending: "Analysed" }[verdictKey]) : verdict.label) : "";
  const titleText = done ? (compact ? "Analysed" : "Analysis complete") : (compact ? "Analysing" : "Analysing document");

  return (
    <div className={"analysis" + (compact ? " compact" : "") + (done ? " done" : "") + (verdict ? " v-" + verdict.cls : "")}>
      <div className="an-head">
        {done
          ? <span className={"an-state-ico " + verdict.cls}>{verdict.cls === "ok" ? <AnCheck size={13} /> : verdict.cls === "warn" ? <AnAlert size={13} /> : <AnShield size={13} />}</span>
          : <span className="an-pulse"></span>}
        <span className="an-title">{titleText}</span>
        <span className="an-file"><AnDoc size={12} /> {item.filename}</span>
        {done
          ? <span className={"an-verdict " + verdict.cls}>{verdictLabel}</span>
          : <span className="an-pct">{pct}%</span>}
      </div>

      <div className="an-body">
        <div className="an-stage">
          <PdfPreview src={meta.src} w={compact ? 120 : 210} variant={meta.faux} />
          <div className="an-grid"></div>
          <span className="an-bracket tl"></span>
          <span className="an-bracket tr"></span>
          <span className="an-bracket bl"></span>
          <span className="an-bracket br"></span>
          <div className="an-stage-tag">{meta.title}</div>
        </div>

        <div className="an-right">
          <div className="an-steps">
            {ANALYSIS_STEPS.map((s, i) => {
              const sdone = e >= s.at;
              const active = !sdone && (i === 0 || e >= ANALYSIS_STEPS[i - 1].at);
              return (
                <div className={"an-step" + (sdone ? " done" : active ? " active" : "")} key={i}>
                  <span className="an-step-ico">
                    {sdone ? <AnCheck size={12} /> : active ? <span className="an-mini-spin"></span> : <span className="an-step-dot"></span>}
                  </span>
                  <span className="an-step-label">{s.label}</span>
                </div>
              );
            })}
          </div>

          <div className="an-fields">
            {shownFields.map((f, i) => {
              const fixed = f.warn && resolved && f.vOk;
              return (
                <div className={"an-field" + (f.warn && !fixed ? " warn" : "") + (fixed ? " ok" : "")} key={i}>
                  <span className="an-field-k">{f.k}</span>
                  <span className="an-field-v">
                    {f.warn && !fixed && <AnAlert size={11} />}
                    {fixed && <AnCheck size={11} />}
                    {fixed ? f.vOk : f.v}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="an-progress"><div className="an-progress-bar" style={{ width: pct + "%" }}></div></div>
    </div>
  );
}

/* ============================================================
   ScanWidget — a separate, Gia-style document scanner. Dark navy field, the
   uploaded documents shown flat side by side with cool field-highlight overlays
   and a sweeping light, section chips that light up as fields are found, and a
   cyan progress bar. Self-timed over ANALYSIS_MS (or `done`).
   ============================================================ */
var SCAN_HILITES = {
  financial: [
    { t: 12, l: 8, w: 52, h: 9, c: "#5B9BFF", at: 0.20 },
    { t: 31, l: 50, w: 40, h: 26, c: "#FFD645", at: 0.46 },
    { t: 66, l: 10, w: 46, h: 9, c: "#3FE0D0", at: 0.72 }
  ],
  contract: [
    { t: 16, l: 10, w: 66, h: 8, c: "#3FE0D0", at: 0.24 },
    { t: 41, l: 12, w: 34, h: 8, c: "#5B9BFF", at: 0.52 },
    { t: 77, l: 16, w: 50, h: 12, c: "#FFD645", at: 0.80 }
  ],
  default: [
    { t: 18, l: 10, w: 62, h: 9, c: "#5B9BFF", at: 0.3 },
    { t: 56, l: 12, w: 42, h: 9, c: "#3FE0D0", at: 0.62 }
  ]
};
function scanChips() {
  return [
    { label: "Existing KYC reused", at: 0.18 },
    { label: "Financial metrics", at: 0.40 },
    { label: "Value variance reviewed", at: 0.60 },
    { label: "Policy thresholds", at: 0.80 },
    { label: "Contract signature", pending: true }
  ];
}

function ScanFields(props) {
  var sets = SCAN_HILITES[props.variant] || SCAN_HILITES.default;
  return sets.map(function (h, i) {
    return React.createElement("span", {
      key: i,
      className: "giascan-hl" + (props.progress >= h.at ? " on" : ""),
      style: { top: h.t + "%", left: h.l + "%", width: h.w + "%", height: h.h + "%", "--hl": h.c }
    });
  });
}

function ScanWidget({ docs, done, ctx }) {
  docs = docs || [];
  const contractValidated = !!(ctx && ctx.docState && (ctx.docState("jlr_contract") || {}).status === "validated");
  const [elapsed, setElapsed] = React.useState(0);
  React.useEffect(() => {
    if (done) { setElapsed(ANALYSIS_MS); return; }
    const start = performance.now();
    let raf;
    const tick = () => { const e = performance.now() - start; setElapsed(e); if (e < ANALYSIS_MS) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [done]);

  const e = done ? ANALYSIS_MS : elapsed;
  const prog = Math.min(1, e / ANALYSIS_MS);
  const pct = Math.round(prog * 100);
  const ANALYSIS_META = analysisMeta();
  const metas = docs.map((d) => ANALYSIS_META[d.docId] || { title: d.filename, faux: null, src: null });

  return (
    <div className={"giascan" + (done ? " done" : "")}>
      <div className="giascan-head">
        <div className="giascan-htext">
          <div className="giascan-title">{done ? "Documents scanned" : "Scanning your documents"}</div>
          <div className="giascan-sub">{docs.length} file{docs.length > 1 ? "s" : ""} · reading &amp; validating fields</div>
        </div>
        <div className="giascan-pct">{pct}%</div>
      </div>

      <div className="giascan-stage">
        <div className="giascan-grid" aria-hidden="true"></div>
        <div className="giascan-pages">
          {docs.map((d, i) => {
            const meta = metas[i];
            return (
              <div className="giascan-page" key={d.docId}>
                <PdfPreview src={meta.src} w={150} variant={meta.faux} />
                <ScanFields variant={meta.faux} progress={prog} />
                {!done && <span className="giascan-beam"></span>}
                <span className="giascan-pagelabel">{meta.title || ("Page " + (i + 1))}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="giascan-chips">
        {scanChips().map((c, i) => {
          const on = c.pending ? contractValidated : prog >= c.at;
          return (
            <span className={"giascan-chip" + (on ? " on" : "") + (c.pending && !contractValidated ? " pend" : "")} key={i}>
              {on && <AnCheck size={12} />} {c.label}
            </span>
          );
        })}
      </div>

      <div className="giascan-progress"><div className="giascan-progress-bar" style={{ width: pct + "%" }}></div></div>
    </div>
  );
}

Object.assign(window, { DocAnalysis, ScanWidget, ANALYSIS_MS });
