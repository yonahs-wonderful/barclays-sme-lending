/* panel.jsx — claim-file panel: a milestone timeline (so progress reads clearly)
   with detail under each step. Document uploads live here (with OCR-style
   feedback). The member name is NOT repeated — it's already in the brand bar. */
const {
  IconCheck: PCheck, IconFolder: PFolder, IconShield: PShield,
  IconDoc: PDoc, IconCard: PCard, IconAward: PAward, IconReceipt: PReceipt,
  IconUser: PUser, IconAlert: PAlert, IconUpload: PUpload,
  IconChevron: PChevron, IconStethoscope: PSteth, IconCheckCircle: PCheckCircle,
  IconPercent: PPercent,
  DOC_ICON: P_DOC_ICON, StatusChip: PStatusChip, FilePicker: PFilePicker,
  fmtMoney: pFmtMoney, fmtDate: pFmtDate
} = window;

/* OCR-style processing feedback while a freshly-uploaded doc is "read". */
function OcrFeedback({ mode }) {
  const steps = mode === "sign"
    ? ["Applying signature…", "Verifying declaration…", "Re-validating…"]
    : ["Uploading…", "Reading document…", "Extracting fields…", "Cross-checking policy…"];
  const [i, setI] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setI((p) => Math.min(p + 1, steps.length - 1)), 480);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="ocr">
      <span className="ocr-spin"></span>
      <span className="ocr-text">{steps[i]}</span>
    </div>
  );
}

function PanelDocList({ file, ctx }) {
  const docs = file.documents || [];
  const exp = ctx.expected || {};
  const DEFAULT_FILE = {
    management_accounts_2024: "Thornfield_2024_Management_Accounts.pdf",
    jlr_contract: "Signed_Contract.pdf",
    kyc_profile: "KYC_Profile.pdf",
    ubo_declaration: "UBO_Declaration.pdf",
    director_ids: "Director_IDs.pdf",
    accounts_2022: "Accounts_2022.pdf",
    accounts_2023: "Accounts_2023.pdf",
    prior_credit_memo: "Prior_Credit_Memo.pdf"
  };
  return (
    <div className="pdl">
      {docs.map((d) => {
        const live = ctx.docState(d.id) || d;
        const st = live.status || "required";
        const IcoEl = P_DOC_ICON[d.id] || PDoc;
        const proc = ctx.isProcessing(d.id);
        const err = ctx.uploadError(d.id);
        const pulse = st === "required" && exp.kind === "upload" && exp.doc_id === d.id;
        return (
          <div className={"pdl-row " + st + (proc ? " processing" : "") + (err ? " uploaderr" : "")} key={d.id}>
            <span className={"pdl-ico " + st}>
              {st === "validated" && !proc ? <PCheck size={15} className="check-pop" /> : <IcoEl size={15} />}
            </span>
            <span className="pdl-main">
              <span className="pdl-toprow">
                <span className="pdl-label">{d.label}</span>
                {!proc && st !== "required" && <PStatusChip status={st} />}
              </span>
              {live.filename && !proc && !err && <span className="pdl-file"><PDoc size={11} /><span className="fn">{live.filename}</span></span>}
              {st === "received" && !proc && !err && <span className="pdl-onfile"><PCheck size={11} /> Retrieved from bank records</span>}
              {st === "validated" && !proc && <span className="pdl-ocr">Fields verified by OCR</span>}
              {st === "issue" && !proc && (
                <span className="pdl-issue"><PAlert size={11} /> {(live.issues && live.issues[0] && live.issues[0].message) || "Action needed"} · sign in chat</span>
              )}
              {err && !proc && <span className="pdl-error"><PAlert size={11} /> {err}</span>}
              {proc && <span className="pdl-procline"><OcrFeedback mode={proc} /></span>}
            </span>
            {!proc && st === "required" && (
              <span className="pdl-action">
                <PFilePicker label={err ? "Try again" : "Upload"} fileName={DEFAULT_FILE[d.id] || "document.pdf"} pulse={pulse}
                  onPick={(name) => ctx.onUpload(d.id, name)} onError={(r) => ctx.onUploadError(d.id, r)} />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* skeleton placeholder rows for a not-yet-loaded section */
function SkeletonRows({ widths }) {
  return (
    <div className="pskel">
      {widths.map((w, i) => (
        <div className="pskel-line" key={i}>
          <span className="pskel-bar k" style={{ width: "34%" }}></span>
          <span className="pskel-bar v" style={{ width: w }}></span>
        </div>
      ))}
    </div>
  );
}
function SecLoading({ label }) {
  return <div className="psec-loading"><span className="ocr-spin"></span><span>{label}</span></div>;
}

/* visual key fact row: tinted icon + caps label + bold value (reads as data, not text) */
function InfoRow({ icon, label, children, tone }) {
  return (
    <div className="pinfo">
      <span className={"pinfo-ic" + (tone ? " " + tone : "")}>{icon}</span>
      <div className="pinfo-text">
        <div className="pinfo-label">{label}</div>
        <div className="pinfo-value">{children}</div>
      </div>
    </div>
  );
}

function ClaimPanel({ file, ctx, stages, open, onToggle }) {
  const f = file || {};
  const st = stages || { details: "pending", eligibility: "pending", documents: "pending" };
  const docs = f.documents || [];
  const docTotal = docs.length;
  const docDone = docs.filter((d) => d.status === "validated" || d.status === "received").length;
  const allDocs = docTotal > 0 && docs.every((d) => d.status === "validated");
  const claim = f.claim || {};
  const cover = f.cover || {};
  const typeLabel = (claim.type || "").replace(/^./, (c) => c.toUpperCase());
  const eligible = f.eligibility === "eligible";
  const recognised = st.details !== "pending";

  // Collapse the Documents section once everything's validated (saves sidebar space).
  const [docsOpen, setDocsOpen] = React.useState(false);
  const autoCollapsed = React.useRef(false);
  React.useEffect(() => {
    if (allDocs && !autoCollapsed.current) { autoCollapsed.current = true; setDocsOpen(false); }
  }, [allDocs]);
  const showDocsBody = !allDocs || docsOpen;

  const Tick = () => <span className="psec-tick"><PCheck size={14} /></span>;
  const headState = (key) => st[key] === "loading" ? <span className="psec-spin"><span className="ocr-spin"></span></span> : null;

  return (
    <aside className={"panel" + (open ? " open" : "")}>
      <div className="panel-head">
        <span className="h">RCF increase</span>
        {claim.ref && <span className="ref">{claim.ref}</span>}
        <button className="panel-toggle" onClick={onToggle}>{open ? "Hide" : "Show"} details</button>
      </div>
      <div className="panel-progress"><div className="bar" style={{ width: (docTotal ? Math.round((docDone / docTotal) * 100) : 0) + "%" }}></div></div>
      <div className="panel-body">
        {!recognised && (
          <div className="panel-intro">Your facility increase builds here. Tell me what you need and I'll fill it in.</div>
        )}

        {/* ---- Details (claim type → condition → date; eligibility folded into header) ---- */}
        <div className={"psec" + (st.details === "pending" ? " pending" : "")}>
          <div className="psec-head">
            <PFolder size={14} /> Details {headState("details")}
            {st.eligibility === "done" && eligible
              ? <span className="psec-badge"><PCheck size={11} /> Eligible</span>
              : (st.details === "done" && <Tick />)}
          </div>
          {st.details === "done" ? (
            <div className="pinfo-list">
              <InfoRow icon={<PFolder size={15} />} label="Request type">{typeLabel || "—"}</InfoRow>
              <InfoRow icon={<PCard size={15} />} label="Increase">{claim.condition ? claim.condition : <span className="pv-pending">Pending review</span>}</InfoRow>
              {f.loan && <InfoRow icon={<PPercent size={15} />} label="Rate">{f.loan.rate}</InfoRow>}
              {f.loan && <InfoRow icon={<PAward size={15} />} label="Repayment">{f.loan.repayment}<span className="pinfo-sub"> /mo</span></InfoRow>}
              <InfoRow icon={<PReceipt size={15} />} label="Requested on">{cover.date_of_event ? pFmtDate(cover.date_of_event) : "—"}</InfoRow>
              <InfoRow icon={<PShield size={15} />} label={f.payment ? "Facility account" : "Account"} tone={st.eligibility === "done" && eligible ? "ok" : null}>
                {st.eligibility === "done"
                  ? (f.payment ? f.payment.account_masked : (f.policy ? f.policy.no : "—"))
                  : <span className="pv-pending">Checking eligibility…</span>}
              </InfoRow>
            </div>
          ) : st.details === "loading" ? (
            <React.Fragment><SecLoading label="Reviewing your request…" /><SkeletonRows widths={["48%", "62%", "40%"]} /></React.Fragment>
          ) : (
            <SkeletonRows widths={["48%", "62%", "40%"]} />
          )}
        </div>

        {/* ---- Documents (appears only after a loan is chosen; collapses once complete) ---- */}
        {st.documents !== "pending" && (
        <div className="psec">
          <div className={"psec-head" + (allDocs ? " psec-clickable" : "")} onClick={allDocs ? () => setDocsOpen((o) => !o) : undefined}>
            <PDoc size={14} /> Documents {docTotal > 0 && st.documents === "done" && <span className="psec-count">{docDone}/{docTotal}</span>} {headState("documents")}{allDocs && <Tick />}
            {allDocs && <span className={"psec-chev" + (docsOpen ? " open" : "")}><PChevron size={15} /></span>}
          </div>
          {st.documents === "done" ? (
            showDocsBody ? <PanelDocList file={f} ctx={ctx} />
              : <button className="pdocs-mini" onClick={() => setDocsOpen(true)}><span className="pdocs-mini-ic"><PCheck size={13} /></span> All {docTotal} documents validated <span className="pdocs-mini-show">Show</span></button>
          ) : st.documents === "loading" ? (
            <React.Fragment><SecLoading label="Preparing your checklist…" /><SkeletonRows widths={["70%", "64%", "58%"]} /></React.Fragment>
          ) : (
            <SkeletonRows widths={["70%", "64%", "58%"]} />
          )}
        </div>
        )}

        {/* ---- Assessment: two-phase track (Assessment → Verdict) ---- */}
        {f.status === "submitted_for_assessment" && (
          <div className="psec passess">
            <div className="psec-head"><PReceipt size={14} /> Assessment</div>
            <div className="passess-banner">
              <span className="passess-live"><span className="passess-dot"></span></span>
              <div className="passess-btext">
                <div className="passess-title">In assessment</div>
                {f.lodged && f.lodged.sla && <div className="passess-sub">Outcome within {f.lodged.sla}</div>}
              </div>
            </div>
            <div className="ptrack">
              <div className="ptrack-step active">
                <span className="ptrack-node"><span className="ptrack-spin"></span></span>
                <div className="ptrack-body">
                  <div className="ptrack-name">Assessment</div>
                  <div className="ptrack-meta">In progress · started today</div>
                </div>
              </div>
              <div className="ptrack-step pending">
                <span className="ptrack-node"><PAward size={13} /></span>
                <div className="ptrack-body">
                  <div className="ptrack-name">Verdict</div>
                  <div className="ptrack-meta">{f.lodged && f.lodged.sla ? "Expected within " + f.lodged.sla : "Pending"} · then payment</div>
                </div>
              </div>
            </div>
            {f.task_id && <div className="ptask">Assessment task · {f.task_id}</div>}
          </div>
        )}
      </div>
    </aside>
  );
}

Object.assign(window, { ClaimPanel });
