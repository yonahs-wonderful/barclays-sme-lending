/* packages.jsx — POS upsell. Optional EFTPOS-terminal offer surfaced right
   before the loan goes for assessment: free for 12 months, then a flat monthly
   fee. Layout (per ref): a contextual pill on top, the terminal illustration on
   a soft tile beside a tight title/sub/price, then full-width benefit bullets
   and the take/skip actions. Member can take it or skip; the loan proceeds
   either way. Data: ctx.posOffer; choice -> ctx.onPos(true|false). */
const { IconCheck: PkCheck, IconArrowRight: PkArrow } = window;

/* Friendly EFTPOS terminal — dark rounded body, green screen, colourful keys. */
function EftposArt() {
  return (
    <svg className="pos-svg" viewBox="0 0 64 78" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="12" y="4" width="40" height="70" rx="9" fill="url(#posBody)" />
      {/* screen */}
      <rect x="18" y="10" width="28" height="22" rx="4" fill="#10312a" />
      <rect x="18" y="10" width="28" height="22" rx="4" fill="url(#posScr)" opacity="0.6" />
      <circle cx="32" cy="21" r="6.5" fill="none" stroke="#5ad29a" strokeWidth="2" />
      <path d="M32 17.5V21l2.4 1.6" stroke="#5ad29a" strokeWidth="2" strokeLinecap="round" />
      {/* colourful keypad */}
      <g>
        <rect x="18" y="38" width="8" height="7" rx="2" fill="#f1889e" />
        <rect x="28" y="38" width="8" height="7" rx="2" fill="#f3c64a" />
        <rect x="38" y="38" width="8" height="7" rx="2" fill="#5ec2d6" />
        <rect x="18" y="48" width="8" height="7" rx="2" fill="#f3c64a" />
        <rect x="28" y="48" width="8" height="7" rx="2" fill="#7cc9a0" />
        <rect x="38" y="48" width="8" height="7" rx="2" fill="#f1889e" />
        <rect x="18" y="58" width="8" height="7" rx="2" fill="#e7483b" />
        <rect x="28" y="58" width="8" height="7" rx="2" fill="#f3c64a" />
        <rect x="38" y="58" width="8" height="7" rx="2" fill="#46c46a" />
      </g>
      <defs>
        <linearGradient id="posBody" x1="12" y1="4" x2="52" y2="74" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3b3b44" /><stop offset="1" stopColor="#202027" />
        </linearGradient>
        <linearGradient id="posScr" x1="18" y1="10" x2="46" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1f6b4a" /><stop offset="1" stopColor="#10312a" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function PosOffer({ ctx }) {
  const offer = ctx.posOffer || {};
  const choice = ctx.posChoice; // "added" | "skipped" | null
  const locked = !!choice;
  const busy = ctx.busy;
  const priceAfter = offer.price_after || "£29";
  const brandNm = (window.TALBrand && window.TALBrand.name) || "Barclays";
  // Card-acceptance product label. Brand-driven via brand.config.
  // its UK card-reader term); falls back to a neutral "Card Reader" if unset.
  const posTerm = (window.TALBrand && window.TALBrand.pos_term) || "Card Reader";
  const feats = (offer.features || [
    "Tap, insert, swipe & mobile wallets",
    "Next-business-day settlement to your " + brandNm + " account"
  ]).slice(0, 2);

  return (
    <div className={"pos card" + (locked ? " locked" : "")}>
      <div className="pos-pill">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4L12 3z" />
        </svg>
        Picked for your expansion
      </div>

      <div className="pos-main">
        <div className="pos-illus"><EftposArt /></div>
        <div className="pos-info">
          <div className="pos-title">{offer.name || (brandNm + " " + posTerm)}</div>
          <div className="pos-sub">{offer.tagline || "Take payments at your new site from day one."}</div>
          <div className="pos-deal">
            <span className="pos-deal-free">Free</span>
            <span className="pos-deal-term">for 12 months, then {priceAfter}/mo</span>
          </div>
        </div>
      </div>

      <ul className="pos-feats">
        {feats.map((f, i) => (
          <li className="pos-feat" key={i}><span className="pos-feat-ic"><PkCheck size={12} /></span>{f}</li>
        ))}
      </ul>

      <div className="pos-actions">
        {locked
          ? (choice === "added"
              ? <div className="pos-locked added"><PkCheck size={15} /> {posTerm} added — free for 12 months</div>
              : <div className="pos-locked skipped">{"No worries — you can add your " + posTerm + " anytime from your dashboard."}</div>)
          : (
            <React.Fragment>
              <button className="btn btn-primary pos-take" disabled={busy} onClick={() => ctx.onPos(true)}>
                Add {posTerm} <PkArrow size={16} />
              </button>
              <button className="btn btn-ghost pos-skip" disabled={busy} onClick={() => ctx.onPos(false)}>No thanks</button>
            </React.Fragment>
          )}
      </div>
    </div>
  );
}

Object.assign(window, { PosOffer, BankingPackage: PosOffer });
