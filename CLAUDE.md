# GoLuQ.com

The website, cockpit (admin), WhatsApp/Telegram guide and marketing machine
of GoLuQ.com Digital Consultancy, Indore. Vite + React + TypeScript +
Tailwind, i18next (en/hi), Hono on Node 20 with SQLite, deployed on Oracle
Mumbai behind Cloudflare with `sudo bash /opt/goluq/deploy/update.sh`.
The running log and to-do live in docs/MASTER.md; owner tasks in
docs/OWNER-TASKS.md. Read the relevant docs/ file before touching an area.

## Rules that are specific to this project
- Brand: "GoLuQ" is written GO + LuQ; the promise is "own, not rent". Never
  say AI, bot, chatbot or assistant in customer-facing copy: it is "the
  replies", "the guide", "workflows that run themselves".
- Honesty: no invented clients, testimonials, figures or certifications.
  Every worked number is framed "suppose" or "say" and captioned "worked
  example". Prices are never hardcoded; they come from live pricing.
- Partner programme: never a percentage or an earnings promise in public
  creatives. Only "a share of every order, monthly on managed customers,
  exact terms on a 30-minute call".
- Secrets (Meta, Telegram, Razorpay, Dodo, Google, YouTube): write-only in
  the cockpit or /opt/goluq/.env, never read back, never committed, rotated
  after being pasted in chat. `Business plan/` and `marketing/` stay out of
  git. `src/data/` is hidden by a gitignore rule; use `git add -f`.
- WhatsApp: opt-out honoured, seven-day cap per number, sends only 09:00 to
  21:00 IST and only when the number health is GREEN.
- Server: Contabo and Oracle host other sites too (nidaanpartner.com).
  Change only /opt/goluq and its nginx block. Never press "Regenerate" on
  Razorpay keys.
- Local machine: never `taskkill /F /IM msedge.exe` (it closes the owner's
  browser); kill only processes whose command line matches
  `headless|edge-probe|_edge`. Never loop the screenshot script over many
  pages. Use `py -3.12` or `py -3.13` for Python.
- Media: films are `<stem>-<en|hi|enin>.mp4` under /media with `-916`
  portrait cuts and `-poster.jpg`; Indian-English voice is the default for
  India and the Gulf, US/UK English elsewhere.
- Video generation lives in video/ (Remotion). Card shorts and captions are
  rendered from code there; scene images and voices stay as they are.

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**This project has a knowledge graph. Start with the code-review-graph
MCP tools to narrow scope, then read the source.** The graph is cheaper than scanning files and
gives you structural context (callers, dependents, test coverage) that file search cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes_tool` or `query_graph_tool` instead of Grep
- **Understanding impact**: `get_impact_radius_tool` instead of manually tracing imports
- **Code review**: `detect_changes_tool` + `get_review_context_tool` instead of reading entire files
- **Finding relationships**: `query_graph_tool` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview_tool` + `list_communities_tool`

### Verify in the source

- Narrow scope with the graph, then read the source. Do not change code from graph output alone.
- For any non-trivial change, read the implementation and the relevant tests before concluding.
- Verify the exact source when touching behavior, database logic, migrations, retries, fallbacks,
  recovery, or compatibility code.
- When the graph and the source disagree, the source wins. The graph may be stale or may not
  model that relationship.
- An empty graph result can mean "not indexed" or "not statically visible", not "does not exist".

### Key Tools

| Tool | Use when |
| ------ | ---------- |
| `detect_changes_tool` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context_tool` | Need source snippets for review — token-efficient |
| `get_impact_radius_tool` | Understanding blast radius of a change |
| `get_affected_flows_tool` | Finding which execution paths are impacted |
| `query_graph_tool` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes_tool` | Finding functions/classes by name or keyword |
| `get_architecture_overview_tool` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes_tool` for code review.
3. Use `get_affected_flows_tool` to understand impact.
4. Use `query_graph_tool` pattern="tests_for" to check coverage.
<!-- /code-review-graph MCP tools -->
