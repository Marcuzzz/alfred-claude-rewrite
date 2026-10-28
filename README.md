# Claude Rewrite Alfred Workflow

Rewrite selected text (usually an email) with Claude and paste the result back into place, so you don't have to copy it into Claude Desktop and back.

## Usage

- **Hotkey ⌃⌥R**: select text in any app (Mail, Outlook, Gmail in the browser, Slack…), press the hotkey and pick a style. The rewrite is pasted over your selection.
- **Keyword `rw`**: works on whatever is on the clipboard.
  - `rw prof` filters the styles (→ *Professional*)
  - `rw say yes to thursday, ask for the agenda` gives a **Custom** item, plus every style with that instruction added (e.g. *Draft reply + "say yes…"*)

Styles: Improve, Professional, Friendly, Shorter, Extend, Fix spelling & grammar, Draft reply, Translate to English, Translate to Dutch, Clean up Markdown, Clean up Markdown with images, Prompt for Image To Video.

- **Extend** turns a short note ("Gefeliciteerd Thomas") into a fuller message without inventing facts.
- **Clean up Markdown** tidies Markdown formatting, improves the wording and adds, merges or relevels headings where the structure calls for it. Code blocks, links and front matter are left alone, and the result is returned as Markdown.
- **Clean up Markdown with images** does the same and also keeps every image, writes alt text and moves images next to the text they belong to. Claude only sees the image references (path, alt text, surrounding text), not the pictures themselves.
- **Prompt for Image To Video** turns a motion description ("na een paar seconden de ogen knipperen, daarna de kop naar links") into an English prompt for an image-to-video model.

Each item's subtitle shows where the text came from (`Selection:` or `Clipboard:`), so you can tell what will be rewritten.

## Adding or editing styles

Each style is a Markdown file in [`prompts/`](prompts/). Add a file and it shows up as a new option, no rebuild needed:

```markdown
---
title: Rhyme
subtitle: Turn it into a short poem
---

Rewrite the text as a short rhyming poem.
```

- The body is the instruction sent to Claude. Lists and paragraphs are fine. `<!-- comments -->` are notes for yourself and are not sent.
- The filename sets the order and the style key: `13-rhyme.md` comes after `12-…` and has key `rhyme`.
- `markdown: true` lets the result be Markdown. Without it, Claude returns plain text ready for an email.
- `extends: markdown` puts that style's instruction in front of this one (see `11-markdown-images.md`).

In the installed workflow the folder sits next to the `claude-rewrite` binary (*Open in Finder* on the workflow). Installing a new release replaces it, so add new styles to this repo and release them, or copy your own files back after updating.

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
