/* esign.jsx — visual-only e-signature pad + file picker. No capture/storage. */
const { IconPen: ESPen, IconUpload: ESUpload, IconDoc: ESDoc } = window;

function ESignPad({ onSign }) {
  const [mode, setMode] = React.useState("draw");
  const [typed, setTyped] = React.useState("");
  const [hasInk, setHasInk] = React.useState(false);
  const canvasRef = React.useRef(null);
  const drawing = React.useRef(false);

  React.useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    c.width = rect.width * dpr; c.height = rect.height * dpr;
    const ctx = c.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = "#161616"; ctx.lineWidth = 2.2;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
  }, [mode]);

  function pos(e) {
    const c = canvasRef.current;
    const r = c.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  }
  function start(e) { e.preventDefault(); drawing.current = true; const ctx = canvasRef.current.getContext("2d"); const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); }
  function move(e) { if (!drawing.current) return; e.preventDefault(); const ctx = canvasRef.current.getContext("2d"); const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); setHasInk(true); }
  function end() { drawing.current = false; }

  function clear() {
    setTyped(""); setHasInk(false);
    const c = canvasRef.current;
    if (c) c.getContext("2d").clearRect(0, 0, c.width, c.height);
  }

  const canSign = mode === "draw" ? hasInk : typed.trim().length > 1;

  return (
    <div className="esign">
      <div className="esign-tabs">
        <button className={"esign-tab" + (mode === "draw" ? " active" : "")} onClick={() => { setMode("draw"); }}>Draw</button>
        <button className={"esign-tab" + (mode === "type" ? " active" : "")} onClick={() => { setMode("type"); }}>Type</button>
      </div>

      <div className="esign-pad">
        <div className="esign-baseline"></div>
        <div className="esign-x">×</div>
        {mode === "draw" ? (
          <React.Fragment>
            {!hasInk && <div className="esign-hint">Draw your signature above the line</div>}
            <canvas
              ref={canvasRef}
              onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
              onTouchStart={start} onTouchMove={move} onTouchEnd={end}
            />
          </React.Fragment>
        ) : (
          <input
            className="esign-type-input" autoFocus value={typed}
            placeholder="Type full name" onChange={(e) => setTyped(e.target.value)}
          />
        )}
      </div>

      <div className="btn-row">
        <button className="btn btn-primary btn-sm" disabled={!canSign}
          style={!canSign ? { background: "var(--ink-300)", cursor: "not-allowed" } : null}
          onClick={() => onSign && onSign()}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><ESPen size={14} /> Sign declaration</span>
        </button>
        <button className="btn btn-ghost btn-sm" onClick={clear}>Clear</button>
      </div>
    </div>
  );
}

function FilePicker({ label, accept, onPick, onError, pulse, fileName }) {
  const ref = React.useRef(null);
  // Visual-only pre-checks (no real OCR/validation). A real, accepted file proceeds;
  // an unreadable one surfaces a reason instead of advancing the flow.
  function handle(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) { onPick && onPick(fileName || "document.pdf"); return; } // demo fallback
    const okType = /^(image\/|application\/pdf)/.test(f.type) || /\.(pdf|png|jpe?g|heic|webp|tiff?)$/i.test(f.name);
    const okSize = f.size <= 15 * 1024 * 1024;
    if (f.size === 0) { onError && onError("This file is empty and couldn't be read. Please choose another."); return; }
    if (!okType) { onError && onError("Unsupported file type. Upload a PDF or image (JPG, PNG)."); return; }
    if (!okSize) { onError && onError("File is too large (over 15 MB). Please upload a smaller copy."); return; }
    onPick && onPick(f.name);
  }
  return (
    <React.Fragment>
      <input ref={ref} type="file" accept={accept || "image/*,application/pdf"} style={{ display: "none" }} onChange={handle} />
      <button className={"upload-slot" + (pulse ? " pulse" : "")} onClick={() => ref.current && ref.current.click()}>
        <ESUpload size={14} /> {label || "Upload"}
      </button>
    </React.Fragment>
  );
}

Object.assign(window, { ESignPad, FilePicker });
