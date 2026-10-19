# Claude Rewrite Alfred Workflow

Rewrite selected text (usually an email) with Claude and paste the result back into place, so you don't have to copy it into Claude Desktop and back.

## Usage

- **Hotkey ⌃⌥R**: select text in any app (Mail, Outlook, Gmail in the browser, Slack…), press the hotkey and pick a style. The rewrite is pasted over your selection.
- **Keyword `rw`**: works on whatever is on the clipboard.
  - `rw prof` filters the styles (→ *Professional*)
  - `rw say yes to thursday, ask for the agenda` gives a **Custom** item, plus every style with that instruction added (e.g. *Draft reply + "say yes…"*)

Styles: Improve, Professional, Friendly, Shorter, Extend, Fix spelling & grammar, Draft reply, Translate to English, Translate to Dutch, Prompt for Image To Video.

- **Extend** turns a short note ("Gefeliciteerd Thomas") into a fuller message without inventing facts.
- **Prompt for Image To Video** turns a motion description ("na een paar seconden de ogen knipperen, daarna de kop naar links") into an English prompt for an image-to-video model.

Each item's subtitle shows where the text came from (`Selection:` or `Clipboard:`), so you can tell what will be rewritten.

## Setup

Install the workflow from `releases/`. Alfred strips hotkeys on import, so set one (e.g. ⌃⌥R) on the Hotkey trigger, then pick a backend in *Configure Workflow*.

### Backend: Claude subscription (default, no API key)

Runs your installed Claude Code CLI (`claude -p`) and uses your Claude plan login. Run `claude` once in a terminal and sign in with your Claude account.

It runs locked down: `--safe-mode --tools "" --strict-mcp-config --setting-sources "" --no-session-persistence`. So no tools, MCP servers, CLAUDE.md, hooks or saved sessions, and `ANTHROPIC_*` / `AWS_*` / `CLAUDE_CODE_USE_*` variables are removed from its environment. Your own Claude Code setup (e.g. Bedrock in `~/.claude/settings.json`) is never used for rewrites.

### Backend: Anthropic API key

Paste the key in the **API key** field, or leave that empty and store it in the macOS Keychain:

```bash
security add-generic-password -a "$USER" -s anthropic-api-key -w
```

The API key field is stored in plain text in your Alfred prefs (`prefs.plist` in the workflow folder). Don't use it if those prefs are synced to a git repo.

### Options

| Option | Default | |
|---|---|---|
| Keyword | `rw` | |
| Backend | Claude subscription | or Anthropic API key |
| Claude Code path | `~/.local/bin/claude` | subscription only |
| API key | — | API only, falls back to Keychain |
| Model | `opus` / `claude-opus-5-5` | subscription accepts aliases (`sonnet`, `haiku`) |
| Effort | Low | higher = slower but more careful |
| Paste result | on | off = copy to the clipboard only |
| About you | — | e.g. "My name is Marc. Sign off with 'Groet, Marc'. I prefer short mails." |

## Development

```bash
npm install
npm test               # unit tests (node:test)
npm run package-mac    # build the ./claude-rewrite binary with pkg
./release.command      # bump the version, build, zip into releases/, tag and create a GitHub release
./release.command pass-patch   # build + zip only (no version bump, no tag or release)
```

Try it without Alfred:

```bash
input_text="hoi, kan je morgen bellen?" ./claude-rewrite styles ""
input_text="hoi, kan je morgen bellen?" style=professional ./claude-rewrite rewrite
```

`rewrite` prints Alfred JSON. Its `status` variable (`ok` / `error`) decides whether the workflow pastes, copies, or shows an error notification, so an error message never gets pasted into your mail.
