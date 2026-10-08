# Claude Rewrite Alfred Workflow

Rewrite selected text (usually an email) with Claude and paste the result back into place, so you don't have to copy it into Claude Desktop and back.

## Usage

- **Hotkey ⌃⌥R**: select text in any app (Mail, Outlook, Gmail in the browser, Slack…), press the hotkey and pick a style. The rewrite is pasted over your selection.
- **Keyword `rw`**: works on whatever is on the clipboard.
  - `rw prof` filters the styles (→ *Professional*)
  - `rw say yes to thursday, ask for the agenda` gives a **Custom** item, plus every style with that instruction added (e.g. *Draft reply + "say yes…"*)

Styles: Improve, Professional, Friendly, Shorter, Fix spelling & grammar, Draft reply, Translate to English, Translate to Dutch.

Each item's subtitle shows where the text came from (`Selection:` or `Clipboard:`), so you can tell what will be rewritten.

## Setup

1. Store your Anthropic API key in the macOS Keychain (it prompts for the key, so it stays out of your shell history):

   ```bash
   security add-generic-password -a "$USER" -s anthropic-api-key -w
   ```

   If there's no Keychain entry, `ANTHROPIC_API_KEY` or an `ant auth login` profile is used instead.

2. Install the workflow from `releases/` and set your options in Alfred → Workflows → Claude Rewrite → *Configure Workflow*:

   | Option | Default | |
   |---|---|---|
   | Keyword | `rw` | |
   | Model | `claude-opus-5-5` | any Claude model ID |
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
