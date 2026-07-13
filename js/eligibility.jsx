/* eligibility.jsx — futuristic, self-timed eligibility verification shown inline
   in the chat the moment a loan request is recognised, BEFORE the options appear.
   A scanning "core" with orbiting rings runs a sequence of live checks
   (identity → account standing → serviceability → credit) and resolves to a big
   ELIGIBLE verdict with the pre-qualified amount. Matches the dark, red-accented
   futuristic language of the document analysis scanner. */
const {
  IconCheck: ElCheck, IconShield: ElShield, IconUser: ElUser, IconCard: ElCard,
  IconPercent: ElPercent, IconCheckCircle: ElCheckCircle
} = window;

const ELIG_MS = 3400;

// Account-standing + serviceability lines are brand/persona-aware: the account tier
// and the revenue-supports amount come from the active mock (window.TALPersonaTier /
// window.TALPrequal), so the active brand reads "Business Current Account" + "$150,000".
// amount param falls back to the prequal global.
function eligChecks(amount) {
  const tier = window.TALPersonaTier || "Business Current Account";
  const amt = amount || window.TALPrequal || "$150,000";
  return [
    { at: 700,  k: "Identity", v: "Daniel Mercer · verified", icon: "user" },
    { at: 1450, k: "Account standing", v: tier + " · good standing", icon: "card" },
    { at: 2300, k: "Serviceability", v: "Revenue supports " + amt, icon: "percent" },
    { at: 3050, k: "Credit & exposure", v: "Within lending limits", icon: "shield" }
  ];
}

const ELIG_ICON = { user: ElUser, card: ElCard, percent: ElPercent, shield: ElShield };

function EligibilityCheck({ amount }) {
  const [elapsed, setElapsed] = React.useState(0);
  React.useEffect(() => {
    const start = performance.now();
    let raf;
    const tick = () => {
      const e = performance.now() - start;
      setElapsed(e);
      if (e < ELIG_MS) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const done = elapsed >= ELIG_MS;
  const pct = Math.min(100, Math.round((elapsed / ELIG_MS) * 100));
  const ELIG_CHECKS = eligChecks(amount);

  return (
    <div className={"elig" + (done ? " done" : "")}>
      <div className="elig-head">
        {done
          ? <span className="elig-state-ico"><ElCheck size={13} /></span>
          : <span className="elig-pulse"></span>}
        <span className="elig-title">{done ? "Eligibility confirmed" : "Running eligibility check"}</span>
        {done
          ? <span className="elig-verdict">Eligible</span>
          : <span className="elig-pct">{pct}%</span>}
      </div>

      <div className="elig-body">
        <div className="elig-core" aria-hidden="true">
          <span className="elig-ring r1"></span>
          <span className="elig-ring r2"></span>
          <span className="elig-ring r3"></span>
          {!done && <span className="elig-sweep"></span>}
          <span className={"elig-coredot" + (done ? " ok" : "")}>
            {done ? <ElCheckCircle size={30} /> : <ElShield size={26} />}
          </span>
          <div className="elig-corelabel">{done ? "Pre-qualified" : "Verifying"}</div>
        </div>

        <div className="elig-right">
          <div className="elig-checks">
            {ELIG_CHECKS.map((c, i) => {
              const cdone = elapsed >= c.at;
              const active = !cdone && (i === 0 || elapsed >= ELIG_CHECKS[i - 1].at);
              const Ico = ELIG_ICON[c.icon] || ElShield;
              return (
                <div className={"elig-check" + (cdone ? " done" : active ? " active" : "")} key={i}>
                  <span className="elig-check-ico">
                    {cdone ? <ElCheck size={12} /> : active ? <span className="elig-mini-spin"></span> : <Ico size={12} />}
                  </span>
                  <span className="elig-check-k">{c.k}</span>
                  <span className="elig-check-v">{cdone ? c.v : (active ? "Checking\u2026" : "Queued")}</span>
                </div>
              );
            })}
          </div>

          <div className={"elig-result" + (done ? " show" : "")}>
            <span className="elig-result-k">Pre-qualified up to</span>
            <span className="elig-result-amt">{amount || "$150,000"}</span>
          </div>
        </div>
      </div>

      <div className="elig-progress"><div className="elig-progress-bar" style={{ width: pct + "%" }}></div></div>
    </div>
  );
}

Object.assign(window, { EligibilityCheck, ELIG_MS });
