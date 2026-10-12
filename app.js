const { execFileSync, spawn } = require('child_process');
const os = require('os');
const Anthropic = require('@anthropic-ai/sdk');
const { buildStyleItems, buildSystemPrompt, buildUserPrompt } = require('./prompts');

const KEYCHAIN_SERVICE = 'anthropic-api-key';
const DEFAULT_MODEL = 'claude-opus-5-5';
const DEFAULT_CLI_MODEL = 'opus';
const DEFAULT_CLAUDE_PATH = '~/.local/bin/claude';
// Stripped from the Claude Code environment so it signs in with your claude.ai subscription, not an API key or Bedrock.
const CLI_ENV_BLOCKLIST = /^(ANTHROPIC_|CLAUDE_CODE_USE_|AWS_)/;
// Models that accept the server-side `fallbacks: "default"` refusal fallback.
const FALLBACK_MODELS = ['claude-fable-5-1', 'claude-opus-5-5', 'claude-opus-5', 'claude-sonnet-5-5'];

// Text comes from the hotkey selection (set as `input_text` by the workflow) or, from the keyword, the clipboard.
function readInput() {
    const selection = process.env.input_text || '';
    if (selection.trim()) return { text: selection, source: 'Selection' };
    try {
        return { text: execFileSync('pbpaste', { encoding: 'utf8' }), source: 'Clipboard' };
    } catch {
        return { text: '', source: 'Clipboard' };
    }
}

// API key: the workflow's "API key" field, then the macOS Keychain, then ANTHROPIC_API_KEY.
// Undefined lets the SDK fall back to an `ant auth login` profile.
function readApiKey() {
    const configured = (process.env.anthropic_api_key || '').trim();
    if (configured) return configured;
    try {
        const key = execFileSync('security', ['find-generic-password', '-s', KEYCHAIN_SERVICE, '-w'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
        if (key) return key;
    } catch {
        // not in Keychain
    }
    return process.env.ANTHROPIC_API_KEY || undefined;
}

function expandHome(p) {
    return p.replace(/^~(?=$|\/)/, os.homedir());
}

// Runs the prompt through the Claude Code CLI (`claude -p`), which uses your Claude subscription login.
// Tools, MCP servers, settings, CLAUDE.md and session history are all switched off: it only rewrites text.
function rewriteWithClaudeCode(text, style, instruction) {
    const claudePath = expandHome((process.env.claude_path || '').trim() || DEFAULT_CLAUDE_PATH);
    const model = (process.env.model || '').trim() || DEFAULT_CLI_MODEL;
    const args = ['-p', '--safe-mode', '--model', model, '--effort', process.env.effort || 'low', '--tools', '', '--strict-mcp-config', '--setting-sources', '', '--no-session-persistence', '--output-format', 'json', '--system-prompt', buildSystemPrompt(process.env.personal_instructions)];
    const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !CLI_ENV_BLOCKLIST.test(name)));

    return new Promise((resolve, reject) => {
        const child = spawn(claudePath, args, { cwd: os.tmpdir(), env, timeout: 120 * 1000 });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', chunk => (stdout += chunk));
        child.stderr.on('data', chunk => (stderr += chunk));
        child.on('error', error => reject(error.code === 'ENOENT' ? new Error(`Claude Code not found at ${claudePath} — set "Claude Code path" in the workflow config`) : error));
        child.on('close', code => {
            let output;
            try {
                output = JSON.parse(stdout);
            } catch {
                return reject(new Error(stderr.trim() || `Claude Code exited with code ${code}`));
            }
            if (output.is_error) {
                const message = String(output.result || 'Claude Code returned an error');
                return reject(new Error(/log ?in|auth|401/i.test(message) ? `${message} — run "claude" in a terminal and sign in with your Claude account` : message));
            }
            const result = String(output.result || '').trim();
            return result ? resolve(result) : reject(new Error('Empty response from Claude Code'));
        });
        child.stdin.end(buildUserPrompt(text, style, instruction));
    });
}

function rewrite(text, style, instruction) {
    return process.env.backend === 'api' ? rewriteWithApi(text, style, instruction) : rewriteWithClaudeCode(text, style, instruction);
}

async function rewriteWithApi(text, style, instruction) {
    const model = (process.env.model || '').trim() || DEFAULT_MODEL;
    const client = new Anthropic({ apiKey: readApiKey(), timeout: 120 * 1000 });

    const params = {
        model,
        max_tokens: 16000,
        output_config: { effort: process.env.effort || 'low' },
        system: buildSystemPrompt(process.env.personal_instructions),
        messages: [{ role: 'user', content: buildUserPrompt(text, style, instruction) }]
    };
    if (FALLBACK_MODELS.includes(model)) {
        params.betas = ['server-side-fallback-2026-07-01'];
        params.fallbacks = 'default';
    }

    const response = await client.beta.messages.create(params);
    if (response.stop_reason === 'refusal') {
        throw new Error('Claude declined to rewrite this text');
    }
    const result = response.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('')
        .trim();
    if (!result) throw new Error(`Empty response (stop reason: ${response.stop_reason})`);
    return result;
}

function describeError(error) {
    if (error instanceof Anthropic.AuthenticationError) return 'Invalid API key — see the workflow README for Keychain setup';
    if (error instanceof Anthropic.RateLimitError) return 'Rate limited by the Claude API, try again in a moment';
    if (error instanceof Anthropic.APIConnectionError) return 'Could not reach the Claude API — check your connection';
    if (error instanceof Anthropic.APIError) return `Claude API error ${error.status}: ${error.message}`;
    if (error && /api key|apiKey|authentication/i.test(error.message)) return 'No API key found — see the workflow README for Keychain setup';
    return error instanceof Error ? error.message : String(error);
}

// Output for a Run Script action: `status` drives the workflow's conditional (paste / copy / show error).
function alfredResult(arg, variables) {
    return JSON.stringify({ alfredworkflow: { arg, variables } });
}

async function main() {
    const [command, query] = process.argv.slice(2);
    const { text, source } = readInput();

    if (command === 'styles') {
        process.stdout.write(JSON.stringify(buildStyleItems(query, text, source)));
        return;
    }

    if (command === 'rewrite') {
        try {
            if (!text.trim()) throw new Error('Nothing to rewrite: no selection and the clipboard is empty');
            const result = await rewrite(text, process.env.style, process.env.instruction);
            process.stdout.write(alfredResult(result, { status: 'ok', message: 'Rewritten text ready' }));
        } catch (error) {
            process.stdout.write(alfredResult('', { status: 'error', message: describeError(error) }));
        }
        return;
    }

    process.stderr.write('Usage: claude-rewrite styles [query] | claude-rewrite rewrite\n');
    process.exitCode = 1;
}

main();
