/* ============================================================
   transport.js — the seam between data source and UI.
   The UI consumes ONLY { events, rich_content } from getNextTurn().
   Swapping mockTransport -> liveTransport must require NO renderer/layout change.
   ============================================================ */
(function () {
  "use strict";

  /* ---- helpers ---- */
  function norm(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9: ]/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\b(\d+)\s+(\d{3})\b/g, "$1$2")
      .trim();
  }
  function likelyRcfRequest(input) {
    return (
      (input.indexOf("credit facility") !== -1 ||
        input.indexOf("revolving credit") !== -1 ||
        input.indexOf("line of credit") !== -1 ||
        input.indexOf("rcf") !== -1) &&
      (input.indexOf("increase") !== -1 ||
        input.indexOf("300000") !== -1 ||
        input.indexOf("300k") !== -1) &&
      (input.indexOf("contract") !== -1 ||
        input.indexOf("automotive") !== -1 ||
        input.indexOf("working capital") !== -1)
    );
  }
  function triggerSetAcceptsRcf(triggers) {
    for (var i = 0; i < triggers.length; i++) {
      var t = norm(triggers[i]);
      if (
        t.indexOf("rcf") !== -1 ||
        t.indexOf("credit facility") !== -1 ||
        t.indexOf("facility increase") !== -1 ||
        t.indexOf("major automotive manufacturer") !== -1
      ) return true;
    }
    return false;
  }
  function matches(triggers, input) {
    if (!triggers || !triggers.length) return false;
    var a = norm(input);
    if (!a) return false;
    if (triggerSetAcceptsRcf(triggers) && likelyRcfRequest(a)) return true;
    for (var i = 0; i < triggers.length; i++) {
      var t = norm(triggers[i]);
      if (!t) continue;
      // event-style triggers (upload:, sign:) must match exactly
      if (t.indexOf(":") !== -1) { if (a === t) return true; continue; }
      if (a.indexOf(t) !== -1 || t.indexOf(a) !== -1) return true;
    }
    return false;
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /* ============================================================
     mockTransport — plays mockData.turns in order.
     Interface:
       getNextTurn(input) -> Promise<{ events, rich_content } | null>
       expectedInput()    -> affordance hint (mock-only, UI may ignore)
       reset()
     ============================================================ */
  function createMockTransport(mockData) {
    var turns = mockData.turns || [];
    var globalChips = mockData.chips || [];
    var idx = 0;

    function fallback() {
      return {
        events: [{
          type: "message", speaker: "agent",
          text: "I didn't quite catch that, but no problem. Let's keep going with your RCF increase."
        }],
        rich_content: []
      };
    }

    function applySideEffect(turn) {
      // Transport-side side effect: stamp a BO task id onto the claim_lodged card.
      if (turn.side_effect === "create_bo_task" && turn.rich_content) {
        turn.rich_content.forEach(function (c) {
          if (c.type === "claim_lodged") {
            c.data.task_id = "BO-TASK-" + (mockData.claim_ref || "CLM").split("-").pop() + "-A";
          }
        });
      }
      return turn;
    }

    return {
      mode: "mock",

      getNextTurn: function (input) {
        return new Promise(function (resolve) {
          if (idx >= turns.length) { resolve(null); return; }
          var turn = turns[idx];
          var advance = turn.auto || matches(turn.triggers, input);
          if (!advance) { resolve(fallback()); return; }
          idx++;
          var t = applySideEffect(clone(turn));
          resolve({ events: t.events || [], rich_content: t.rich_content || [] });
        });
      },

      // Mock-only affordance hint. liveTransport returns null and the UI
      // gracefully falls back to showing all affordances.
      expectedInput: function () {
        if (idx >= turns.length) return { kind: "end" };
        var turn = turns[idx];
        if (turn.auto) return { kind: "auto" };
        var trg = turn.triggers || [];
        for (var i = 0; i < trg.length; i++) {
          var t = String(trg[i]);
          if (t.indexOf("upload:") === 0) return { kind: "upload", doc_id: t.slice(7) };
          if (t.indexOf("sign:") === 0) return { kind: "sign", doc_id: t.slice(5) };
        }
        // free-text / chip reply step: collect contextual suggestion chips
        var chips = [];
        (turn.suggestions || []).forEach(function (s) {
          if (s && typeof s === "object") chips.push({ label: s.label, sends: s.sends || s.label, noop: !!s.noop });
          else chips.push({ label: s, sends: s });
        });
        globalChips.forEach(function (c) {
          if (matches(turn.triggers, c.sends)) chips.push({ label: c.label, sends: c.sends });
        });
        return { kind: "reply", chips: chips };
      },

      reset: function () { idx = 0; }
    };
  }

  /* ============================================================
     liveTransport — STUB ONLY. Do not implement here.
     The real implementation (send + poll + parse_rich_content) lands in
     the repo. It must satisfy the SAME interface and emit the SAME card
     shapes (see CARD-CONTRACT.md), so no renderer or layout changes.
     ============================================================ */
  function createLiveTransport(config) {
    config = config || {};
    var base = String(config.proxyUrl || config.baseUrl || "").replace(/\/$/, "");
    var bridgeToken = null;
    function newToken() { return Array.from(crypto.getRandomValues(new Uint8Array(32))).map(function(n){return n.toString(16).padStart(2,"0");}).join(""); }
    async function bridge(action, data) {
      if (!bridgeToken) bridgeToken = newToken();
      var r;
      for(var attempt=0;attempt<3;attempt++) {
        try { r = await fetch(config.bridgeUrl, {method:"POST", headers:{"Content-Type":"text/plain"}, body:JSON.stringify(Object.assign({action:action,token:bridgeToken},data||{}))}); break; }
        catch(error) { if(action!=="poll" || attempt===2) throw error; await new Promise(function(resolve){setTimeout(resolve,500*(attempt+1));}); }
      }
      var raw = await r.json();
      var result = raw.result || raw;
      if (!r.ok || result.error) throw new Error(result.error || "Chat service unavailable ("+r.status+")");
      return result;
    }
    var sessionId = null, cursor = "0-0", started = false;
    var docLabels = {}; // learned from claim_file_opened so uploads name the right document
    var loanType = "business"; // tracked from claim_type_identified; selects the booking template
    var pendingLoanChoice = null; // finance-option name the user picked in the UI widget, awaiting relay
    var loanRelaySent = false;    // guard: relay the lodge message at most once per session
    // Multi-step UI flow (redesign): the disbursement picker + banking-package
    // chooser sit BETWEEN payment_details and lodge, and the user sends their own
    // explicit "confirm disbursement" / "submit for assessment" text. When that
    // flow is active we must NOT auto-relay the lodge on payment_details (it would
    // skip those steps). setFlow("package") opts into deferring the auto-relay.
    var deferAutoRelay = false;
    // Phase tracking for suggestion chips (mirrors mockTransport's per-turn
    // suggestions). We can't read the mock's scripted turns live, so we derive a
    // small phase from the card types the live agent has emitted so far. Each
    // parsed turn bumps `phase` forward; expectedInput() maps phase -> chips.
    // Phases: "start" -> "options" -> "documents" -> "signature" -> "disbursement" -> "lodged".
    var phase = "start";

    function normalizeLiveString(value) {
      var brandName = (window.TALBrand && window.TALBrand.name) || "Barclays";
      var agentName = (window.TALBrand && window.TALBrand.agent_name) || "Talia";
      var personaName = window.TALPersonaName || "James Thornfield";
      var firstName = String(personaName).split(" ")[0] || "James";
      var entityName = (window.TALDocLocale && window.TALDocLocale.entity) || "Thornfield Precision Engineering Ltd";
      return String(value)
        .replace(/\bDaniel Mercer\b/g, personaName)
        .replace(/\bDaniel\b/g, firstName)
        .replace(/\bMercer Precision Engineering(?: Pty Ltd| Ltd)?\b/g, entityName)
        .replace(/\b(?:Barclays|NAB)\b/g, brandName)
        .replace(/\bMax\b/g, agentName);
    }

    function normalizeLiveValue(value) {
      if (typeof value === "string") return normalizeLiveString(value);
      if (!value || typeof value !== "object") return value;
      if (Array.isArray(value)) return value.map(normalizeLiveValue);
      var out = {};
      Object.keys(value).forEach(function (key) {
        out[key] = normalizeLiveValue(value[key]);
      });
      return out;
    }

    function normalizeLiveTurn(turn) {
      if (!turn) return turn;
      turn.events = (turn.events || []).map(function (event) {
        if (event && typeof event.text === "string") {
          return Object.assign({}, event, { text: normalizeLiveString(event.text) });
        }
        return event;
      });
      turn.rich_content = (turn.rich_content || []).map(function (card) {
        return card && card.data
          ? Object.assign({}, card, { data: normalizeLiveValue(card.data) })
          : card;
      });
      return turn;
    }

    function headers() {
      var h = { "Content-Type": "application/json" };
      if (config.apiKey) h["X-Api-Key"] = config.apiKey; // proxy may inject this server-side instead
      return h;
    }
    function api(path) { return base + "/api/v3/chat" + path; }

    async function createSession() {
      if (config.bridgeUrl) { var j = await bridge("start"); sessionId=j.data.session_id; cursor=j.data.cursor||"0-0"; return; }
      var r = await fetch(api(""), { method: "POST", headers: headers(), body: JSON.stringify({
        agent_id: config.agentId, source: "in_website", comm_type: "chat", channel: "web",
        from: config.fromName || "demo", from_type: "name", send_internal_events: true
      })});
      if (!r.ok) throw new Error("create session failed: " + r.status);
      var j = await r.json();
      sessionId = j.data.session_id; cursor = j.data.cursor || "0-0";
    }
    async function sendMessage(text) {
      if (config.bridgeUrl) { await bridge("send",{text:text,event_id:crypto.randomUUID()}); return; }
      var r = await fetch(api("/" + sessionId), { method: "POST", headers: headers(), body: JSON.stringify({
        event_id: "c-" + Date.now(), session_id: sessionId, speaker: "customer",
        data: { type: "text", text: text }
      })});
      if (!r.ok) throw new Error("send failed: " + r.status);
    }
    // Long-poll until the agent's turn finishes: agent text seen AND a poll returns empty,
    // or two consecutive empty polls (guards a turn with cards but no closing text).
    async function pollTurn() {
      var collected = [], gotAny = false, idle = 0;
      for (var i = 0; i < 40; i++) {
        // Wait long for the turn to START (block=20); once events arrive, poll briefly
        // (block=3) so the END of the burst is detected in ~3s, not a full 20s.
        var block = gotAny ? 3 : 20;
        var r = config.bridgeUrl ? null : await fetch(api("/" + sessionId + "?cursor=" + encodeURIComponent(cursor) + "&block=" + block), { headers: headers() });
        if (r && !r.ok) throw new Error("poll failed: " + r.status);
        var j = config.bridgeUrl ? await bridge("poll",{cursor:cursor,block:gotAny?1:10}) : await r.json();
        var evs = (j.data && j.data.events) || [];
        if (j.data && j.data.cursor) cursor = j.data.cursor;
        if (evs.length) { collected.push.apply(collected, evs); gotAny = collected.some(function(e){ return e.speaker === "agent" && e.data && e.data.type === "text"; }); idle = 0; if(config.bridgeUrl && gotAny) break; }
        else if (gotAny) { break; }       // burst finished
        else if (++idle >= 2) { break; }  // nothing at all after 2 long polls
      }
      return collected;
    }
    // The mock matches literal "upload:<id>" / "sign:<id>"; a live agent needs words.
    function toAgentText(input) {
      if (typeof input !== "string") return "";
      if (config.bridgeUrl && input === "confirm disbursement") return "I confirm the selected facility account. Please submit my RCF increase case for credit assessment now.";
      if (input.indexOf("upload:") === 0) {
        var id = input.slice(7);
        return "I've uploaded my " + (docLabels[id] || id.replace(/_/g, " ")) + ".";
      }
      if (input.indexOf("sign:") === 0) return "I've signed it.";
      return input;
    }
    // Phase ordering for the suggestion chips. Cards only ever move the phase
    // FORWARD (so a late panel-only card can't drag us back to an earlier step).
    var PHASE_ORDER = { start: 0, options: 1, documents: 2, signature: 3, disbursement: 4, lodged: 5 };
    function advancePhase(p) {
      if (PHASE_ORDER[p] != null && PHASE_ORDER[p] > PHASE_ORDER[phase]) phase = p;
    }
    // Map a parsed card to the phase it implies for the chip suggestions.
    function phaseForCard(c) {
      switch (c.type) {
        // Eligibility verdict + options are presented together -> "pick a loan".
        // NOTE: claim_file_opened arrives in the SAME buffered recognition turn as
        // cover_status, so we deliberately do NOT advance to "documents" on it —
        // the user still has to pick a loan first. The move to "documents" is gated
        // on the actual loan selection (setLoanChoice), not on this card.
        case "cover_status": return "options";
        // An unsigned/flagged document -> sign hint. A clean validation does not
        // change the chip phase (the uploader/sign controls drive those steps).
        case "document_status":
          return (c.data && c.data.status === "issue") ? "signature" : null;
        // Disbursement confirmed -> offer the explicit "submit for assessment" chip.
        case "payment_details": return "disbursement";
        // Lodged -> end of flow, no chips.
        case "claim_lodged": return "lodged";
        default: return null;
      }
    }

    // Learn doc id->label (for upload messages) + loan_type (for the booking template) from cards.
    function harvest(turn) {
      (turn.rich_content || []).forEach(function (c) {
        if (c.type === "claim_file_opened" && c.data && c.data.required_documents) {
          c.data.required_documents.forEach(function (d) { if (d && d.id) docLabels[d.id] = d.label; });
        }
        if (c.type === "claim_type_identified" && c.data) {
          var ct = String(c.data.claim_type || "").toLowerCase();
          if (ct.indexOf("student") !== -1) loanType = "student";
          else if (ct.indexOf("business") !== -1) loanType = "business";
        }
        var ph = phaseForCard(c);
        if (ph) advancePhase(ph);
      });
      return turn;
    }

    function hasCard(turn, type) {
      return (turn.rich_content || []).some(function (c) { return c.type === type; });
    }
    // DETERMINISTIC LODGE RELAY. The UI's finance-option widget records the user's
    // pick early (before documents), but the agent only lodges after the
    // disbursement account is confirmed. So we hold the pick (pendingLoanChoice)
    // and, the moment a turn confirms disbursement (a payment_details card), we
    // send an explicit, unambiguous confirmation that triggers update_claim_status —
    // instead of relying on the user to re-type their choice as fuzzy free text.
    // The resulting lodge turn is merged into the same turn the UI renders, so the
    // claim_lodged card shows up right after disbursement with no extra user step.
    async function maybeRelayLoanChoice(turn) {
      if (config.bridgeUrl) return turn; // Conversational Talia requires a real customer confirmation.
      if (loanRelaySent || !pendingLoanChoice) return turn;
      // Redesign flow: defer the auto-relay — the UI drives disbursement + package
      // confirmation explicitly, and the user's own "submit for assessment" text
      // lodges the request. (Old single-step flow still auto-relays on payment_details.)
      if (deferAutoRelay) return turn;
      if (!hasCard(turn, "payment_details")) return turn;
      loanRelaySent = true;
      var msg = "I confirm the " + pendingLoanChoice + ". Please submit my loan application now.";
      await sendMessage(msg);
      var lodgeTurn = harvest(window.LiveCore.eventsToTurn(await pollTurn()));
      // Merge the lodge turn into the disbursement turn so the UI renders both.
      turn.events = (turn.events || []).concat(lodgeTurn.events || []);
      turn.rich_content = (turn.rich_content || []).concat(lodgeTurn.rich_content || []);
      return turn;
    }

    // NOTE: the client-side loan_application row write (lodgeRow) was REMOVED.
    // The single source of truth for the admin queue is the SERVER-SIDE path:
    // Talia's update_claim_status -> lodge-and-underwrite -> backoffice underwriting.
    // Writing a row from the client polluted the curated mid-market queue and could
    // duplicate the server row, so the client no longer POSTs to custom-tables.
    // The claim_lodged confirmation card renders the agent's OWN claim_ref as-is.

    return {
      mode: "live",
      getNextTurn: async function (input) {
        var turn;
        // Redesign flow: the package-confirm step sends a weak "submit for assessment"
        // label, and the user's finance-option pick was never relayed. The live agent
        // often fails to lodge on that, so claim_lodged (and the loan_application row)
        // never fires. At that submit step, substitute the STRONG, explicit lodge cue
        // (incl. the chosen option) that reliably triggers update_claim_status — the
        // same message the old single-step flow used. Fires once per session.
        if (!config.bridgeUrl && deferAutoRelay && !loanRelaySent && pendingLoanChoice
            && typeof input === "string" && /submit|assess/i.test(input)) {
          input = "I confirm the " + pendingLoanChoice + ". Please submit my loan application for assessment now.";
          loanRelaySent = true;
        }
        if (!started) { started = true; await createSession(); turn = harvest(window.LiveCore.eventsToTurn(await pollTurn())); }
        else if (input == null) { turn = harvest(window.LiveCore.eventsToTurn(await pollTurn())); }
        else { await sendMessage(toAgentText(input)); turn = harvest(window.LiveCore.eventsToTurn(await pollTurn())); }
        turn = await maybeRelayLoanChoice(turn); // deterministic lodge once disbursement is confirmed
        // The admin-queue row is written SERVER-SIDE (Talia -> lodge-and-underwrite).
        // The client does NOT write a loan_application row (see note above). The
        // claim_lodged card renders the agent's own claim_ref unmodified.
        return normalizeLiveTurn(turn);
      },
      // The UI widget calls this on "Confirm & continue"; we relay it as a clean
      // lodge message at the right point in the agent's flow (see maybeRelayLoanChoice).
      setLoanChoice: function (name) {
        if (name && !loanRelaySent) pendingLoanChoice = String(name);
        // The loan pick is the real gate out of the "options" phase: only now does
        // the documents step (and its upload hint chip) become the right suggestion.
        advancePhase("documents");
      },
      // The redesigned UI calls setFlow("package") to opt into the multi-step
      // disbursement + package confirmation (so the auto-relay defers — see above).
      setFlow: function (kind) { if (kind === "package") deferAutoRelay = true; },
      // Contextual "suggested things to say" chips, driven by the phase derived
      // from the cards the live agent has emitted (see harvest/phaseForCard). The
      // wording mirrors mockTransport's per-turn suggestions + the design flow.
      // For text-reply steps we send real utterances; for steps whose real action
      // is an upload/sign control we use noop chips (hints, not duplicate actions).
      expectedInput: function () {
        var isStudent = false;
        try { isStudent = (window.DEMO_CONFIG && window.DEMO_CONFIG.domain === "student") || loanType === "student"; }
        catch (e) {}
        var chips;
        switch (phase) {
          case "start":
            chips = isStudent
              ? [
                  { label: "Apply for a student loan", sends: "I'd like a student loan to cover my tuition and living costs" },
                  { label: "Check my balance", noop: true },
                  { label: "Make a payment", noop: true }
                ]
              : [
                  { label: "Increase our RCF", sends: "I've just signed a new contract with a major automotive manufacturer and need a £300,000 increase to my credit facility to fund it" },
                  { label: "Check my balance", noop: true },
                  { label: "Make a payment", noop: true }
                ];
            break;
          case "options":
            // Steer toward the recommended facility amendment path.
            chips = isStudent
              ? [{ label: "Go with the fixed student loan", sends: "I'll go with the fixed student loan" }]
              : [{ label: "Use the RCF increase", sends: "I'll go with the RCF increase to £500,000" }];
            break;
          case "documents":
            // The real upload affordance is the uploader card; keep this a light hint.
            chips = [{ label: "Upload my documents", noop: true }];
            break;
          case "signature":
            // The sign widget is the real control; this is just a nudge.
            chips = [{ label: "Sign it now", noop: true }];
            break;
          case "disbursement":
            chips = [{ label: "Yes, submit it for assessment", sends: "Yes, please submit my application for assessment" }];
            break;
          default: // "lodged" or anything else -> no chips
            chips = [];
        }
        return { kind: "reply", chips: chips };
      },
      getMilestones: config.bridgeUrl ? function () { return bridge("milestones"); } : undefined,
      reset: function () { bridgeToken = null; sessionId = null; cursor = "0-0"; started = false; pendingLoanChoice = null; loanRelaySent = false; deferAutoRelay = false; phase = "start"; }
    };
  }

  window.TALTransport = {
    createMockTransport: createMockTransport,
    createLiveTransport: createLiveTransport
  };
})();
