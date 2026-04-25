# Chat-First Product Spec

Botomatic is chat-first.

Behavior contract:
- User can submit messy notes, fragments, rambling instructions, or partial specs in chat.
- Botomatic transforms chat input into a structured commercial product spec.
- Botomatic asks concise, high-leverage clarifying questions when risk or ambiguity requires confirmation.
- Botomatic fills only low-risk gaps automatically and records those decisions.
- Botomatic must not auto-decide high-risk requirements.
- Botomatic produces and enforces a Build Contract before planning and execution.

No mode button policy:
- Do not expose Guided Mode / Fast Mode / Autopilot Mode buttons.
- Do not require user mode selection to drive behavior.
- Internal style inference is allowed but must remain invisible in user controls.

UI role:
- UI panels can surface completeness, assumptions, recommendations, blockers, and readiness.
- Chat remains the command/control path for progressing work.
