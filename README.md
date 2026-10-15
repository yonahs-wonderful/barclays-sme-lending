# Barclays SME lending demo

Live demo: https://yonahs-wonderful.github.io/barclays-sme-lending/

The default experience uses **Talia — Barclays Lending**, a new conversational agent in **USA → Barclays**. It preserves the original frontend layout, widgets and canonical happy-path responses, while answering questions and understanding natural variations in customer requests.

## Fallbacks

- `?mode=mock`: original browser-scripted experience, no agent conversation.
- `?mode=legacy`: original Max through its existing proxy, unchanged.
- Reload the page to start a fresh conversation. Fallback selection is explicit; failures never silently switch to a simulated success.

## Where to find the new agent and activity

[New agent](https://usa.app.demo.wonderful.ai/workspace/166dbd8c-42a9-4324-bb75-565b62bda5ba/agent-studio-v2/2b6de6c2-238f-4a31-8deb-03369021656e/instructions)

[USA / Barclays activities](https://usa.app.demo.wonderful.ai/workspace/166dbd8c-42a9-4324-bb75-565b62bda5ba/activities)

Agent ID: `2b6de6c2-238f-4a31-8deb-03369021656e`.
Original Max remains `dc76c398-f699-49e4-b8ef-9c33e60b3bc1` in the separate Barclays tenant.

## How it works

The frontend calls the restricted `ys-barclays-chat` Wonderful Function. The function pins the new agent, keeps credentials server-side, creates a random-token-bound session, and sends/polls the v3 Chat API. It exposes only text, lifecycle events and the lending tool result. It rejects other browser origins and unknown sessions, limits messages, and bounds new session creation.

The model interprets intent. `lending_step` stores progress per conversation and returns canonical text plus the original card contract. Questions do not move progress; missing documents block submission. The frontend uses canonical tool text verbatim and keeps natural answers for questions. Polling waits for an agent reply, not a customer echo.

The final account-confirmation control retains the original submit behavior. On explicit submission the agent calls the existing idempotent `ys-corebank-handoff` function, which starts **CoreBank Lending Entry** (`f4dba0f8-1d5c-42ef-9495-e1af551dc244`). The completion card includes the real task ID. A failed handoff does not produce the submission-success card.

## Demo data boundary

James/Thornfield, financials, document validation, eligibility, pricing and Sarah Chen review wording are demonstration fixtures from `mock-data.json`. This does not perform real credit assessment, send a real officer notification, or book lending. PDF uploads retain the original demonstration behavior; the agent receives the upload notification and uses fixture-backed checks. CoreBank entry is real computer automation against the demonstration website.

## Checks

Run `node tests/conversation-contract.cjs` to verify exact copy/card mapping, natural answers, the original Max tool mapping, customer-echo filtering and delayed replies.

Agent and bridge source are versioned in Wonderful Git in the Barclays workspace. The agent's `tools/lending_step/fixture.json` is copied from this repository's `mock-data.json`; update both together when changing canonical content. Do not put API credentials into this static site.

## Live milestone confirmations
The current Barclays Talia chat checks its own submitted application's status
through the existing authenticated bridge every three seconds. It displays one
message when a fresh cockpit approval is saved and one when its CoreBank entry
task completes successfully. Entry currently starts at submission, so these
milestones may arrive in either order. Entry completion is not credit approval.
The bridge binds the task/reference from the agent's server response and ignores
cockpit decisions predating this submission. No timer fabricates success; failed
or unavailable tasks never generate a completion message. Keep the tab open;
reloading starts a new chat. Checks stop after both milestones or one hour.
These are chat bubbles, not another LLM call or a resumed voice session.
