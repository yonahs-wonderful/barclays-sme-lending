/* loanoptions.jsx — finance-product chooser. Three option cards (radio-style
   selection) rendered inline in the chat after the loan request is recognised
   and before documents are uploaded. Data comes from mock-data.json -> ctx.loanOptions.
   On confirm it calls ctx.onConfirmLoan(opt); once confirmed the widget locks. */
const {
  IconCheck: LoCheck, IconCard: LoCard, IconPercent: LoPercent,
  IconReceipt: LoReceipt, IconArrowRight: LoArrow, IconCheckCircle: LoStar
} = window;

function LoanOptionCard({ opt, selected, locked, onSelect }) {
  const cls = "loanopt" + (selected ? " selected" : "") + (opt.recommended ? " recommended" : "") + (locked && !selected ? " dimmed" : "");
  const style = { "--accent": opt.accent || "var(--brand)", "--accent-soft": opt.accent_soft || "var(--brand-tint)" };
  const rank = opt.path_label || (opt.recommended ? "Path 1" : "Path 2");
  return (
    <div
      className={cls}
      style={style}
      role="radio"
      aria-checked={selected}
      tabIndex={locked ? -1 : 0}
      onClick={() => { if (!locked) onSelect(); }}
      onKeyDown={(e) => { if (!locked && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onSelect(); } }}
    >
      <span className="loanopt-rank">{rank}</span>
      {opt.recommended && <span className="loanopt-badge"><LoStar size={11} /> {opt.badge || "Best fit for you"}</span>}
      <span className="loanopt-top">
        <span className="loanopt-tag">{opt.tag}</span>
        <span className="loanopt-radio" aria-hidden="true">{selected && <LoCheck size={13} />}</span>
      </span>
      <span className="loanopt-name">{opt.name}</span>

      <span className="loanopt-hero">
        <span className="loanopt-hero-num">{opt.repayment}</span>
        {opt.repayment_unit !== "" && <span className="loanopt-hero-per">{opt.repayment_unit || "/ month"}</span>}
      </span>
      <span className="loanopt-hero-note">{opt.repayment_note}</span>

      {(opt.fit || opt.consider) && (
        <span className="loanopt-fit">
          {opt.fit && <span><b>Use when</b>{opt.fit}</span>}
          {opt.consider && <span><b>Watch</b>{opt.consider}</span>}
        </span>
      )}

      <span className="loanopt-rows">
        <span className="lrow">
          <span className="lrow-ic"><LoCard size={14} /></span>
          <span className="lrow-k">{opt.amount_label}</span>
          <span className="lrow-v">{opt.amount}</span>
        </span>
        <span className="lrow">
          <span className="lrow-ic"><LoPercent size={14} /></span>
          <span className="lrow-k">Rate</span>
          <span className="lrow-v">{opt.rate}</span>
        </span>
        <span className="lrow">
          <span className="lrow-ic"><LoReceipt size={14} /></span>
          <span className="lrow-k">Fee</span>
          <span className="lrow-v">{opt.fee}</span>
        </span>
      </span>
    </div>
  );
}

function LoanOptions({ ctx }) {
  const options = ctx.loanOptions || [];
  const confirmedId = ctx.loanChoice || null;
  const locked = !!confirmedId;
  const recommended = options.find((o) => o.recommended) || options[0] || null;
  const [sel, setSel] = React.useState(confirmedId || (recommended && recommended.id) || null);
  // keep in sync if a confirmation lands from elsewhere
  React.useEffect(() => { if (confirmedId) setSel(confirmedId); }, [confirmedId]);

  const chosen = options.find((o) => o.id === sel) || null;
  const action = chosen || recommended;

  const loader = (
    <div className="option-loader card option-loader-standalone" aria-label="Preparing finance options">
      <div className="option-loader-head">
        <span className="option-loader-dot"></span>
        <div>
          <div className="option-loader-k">Preparing options</div>
          <div className="option-loader-t">Checking fit, terms and next best action</div>
        </div>
      </div>
      <div className="option-loader-steps">
        <span>Facility fit</span>
        <span>Contract timing</span>
        <span>Documents reused</span>
      </div>
    </div>
  );

  return (
    <div className="loanopts-reveal">
      {loader}
      <div className={"loanopts card" + (locked ? " locked" : "")}>
        <div className="loanopts-head">
          <div className="card-eyebrow">Next best action</div>
          <div className="loanopts-title">{(window.TALLoanCopy && window.TALLoanCopy.title) || "Recommended action"}</div>
          <div className="loanopts-sub">{(window.TALLoanCopy && window.TALLoanCopy.sub) || "Review the ranked actions, then confirm to continue."}</div>
        </div>

        {action && (
          <div className="nba-summary" style={{ "--accent": action.accent, "--accent-soft": action.accent_soft }}>
            <div className="nba-summary-main">
              <span className="nba-summary-k">Talia's next best action</span>
              <strong>{action.name}</strong>
              <p>{action.best_for}</p>
            </div>
            <div className="nba-summary-facts">
              <span className="nba-summary-basis"><b>$200,000 + $300,000</b> = proposed $500,000 limit</span>
              <span><b>{action.amount}</b> {action.amount_label}</span>
              <span><b>{action.rate}</b> indicative rate</span>
              <span><b>{action.repayment}</b> {action.repayment_unit || "limit"}</span>
            </div>
          </div>
        )}

      <div className="loanopts-grid" role="radiogroup" aria-label="Finance options">
        {options.map((opt) => (
          <LoanOptionCard
            key={opt.id}
            opt={opt}
            selected={sel === opt.id}
            locked={locked}
            onSelect={() => setSel(opt.id)}
          />
        ))}
      </div>

      <div className="loanopts-detail" style={chosen ? { "--accent": chosen.accent, "--accent-soft": chosen.accent_soft } : null}>
        {chosen ? (
          <p className="loanopts-detail-text">
            <span className="loanopts-detail-name">{chosen.name}</span> · {chosen.comparison || chosen.repayment_note}
            <a className="loanopts-terms" href="#" onClick={(e) => { e.preventDefault(); }}>Full terms <LoArrow size={12} /></a>
          </p>
        ) : (
          <p className="loanopts-detail-text muted">Select an action above to see what it's best suited for.</p>
        )}
      </div>

      <div className="loanopts-foot">
        {locked ? (
          <div className="loanopts-locked"><LoCheck size={15} /> {chosen ? chosen.name : "Option"} selected</div>
        ) : (
          <button
            className="btn btn-primary loanopts-confirm"
            disabled={!chosen}
            onClick={() => { if (chosen) ctx.onConfirmLoan(chosen); }}
          >
            Confirm &amp; continue
          </button>
        )}
      </div>
    </div>
    </div>
  );
}

Object.assign(window, { LoanOptions });
