const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { STYLES, buildStyleItems, buildSystemPrompt, buildUserPrompt, preview, loadStyles, parsePromptFile, styleKeyFromFile } = require('../prompts');

const MAIL = 'Hi Jan,\n\nkan je de factuur nog sturen?\n\nGroet, Marc';

test('Should_ListAllPresets_When_QueryIsEmpty', () => {
    const { items } = buildStyleItems('', MAIL, 'Selection');
    assert.equal(items.length, STYLES.length);
    assert.ok(items.every(item => item.valid && item.variables.instruction === ''));
});

test('Should_FilterPresetsByTitle_When_QueryMatchesAStyle', () => {
    const { items } = buildStyleItems('prof', MAIL, 'Selection');
    assert.deepEqual(items.map(item => item.arg), ['professional']);
});

test('Should_OfferCustomAndAttachInstruction_When_QueryMatchesNoStyle', () => {
    const { items } = buildStyleItems('say yes to thursday', MAIL, 'Selection');
    assert.equal(items[0].variables.style, 'custom');
    assert.equal(items.length, STYLES.length + 1);
    assert.ok(items.every(item => item.variables.instruction === 'say yes to thursday'));
});

test('Should_MarkItemsInvalid_When_ThereIsNoText', () => {
    const { items } = buildStyleItems('', '   ', 'Clipboard');
    assert.ok(items.every(item => item.valid === false));
    assert.match(items[0].subtitle, /clipboard is empty/);
});

test('Should_ShowSourcePreview_When_TextIsPresent', () => {
    const { items } = buildStyleItems('', MAIL, 'Clipboard');
    assert.match(items[0].subtitle, /Clipboard: Hi Jan, kan je/);
});

test('Should_ForbidEmDashes_When_BuildingSystemPrompt', () => {
    assert.match(buildSystemPrompt(''), /Never use em dashes/);
});

test('Should_WrapTextInTags_When_BuildingUserPrompt', () => {
    const prompt = buildUserPrompt(MAIL, 'shorter');
    assert.match(prompt, /^Task: Make the text significantly shorter/);
    assert.ok(prompt.endsWith(`<text>\n${MAIL}\n</text>`));
});

test('Should_AppendExtraInstruction_When_StyleAndInstructionGiven', () => {
    const prompt = buildUserPrompt(MAIL, 'reply', 'say yes to thursday');
    assert.match(prompt, /email I received/);
    assert.match(prompt, /Additional instruction: say yes to thursday/);
});

test('Should_UseInstructionAsTask_When_StyleIsCustom', () => {
    assert.match(buildUserPrompt(MAIL, 'custom', 'make it rhyme'), /^Task: make it rhyme\n/);
});

test('Should_Throw_When_CustomStyleHasNoInstruction', () => {
    assert.throws(() => buildUserPrompt(MAIL, 'custom', ''), /Unknown style/);
});

test('Should_IncludePersonalInstructions_When_Configured', () => {
    assert.match(buildSystemPrompt('Sign off as Marc'), /preferences:\nSign off as Marc$/);
    assert.doesNotMatch(buildSystemPrompt('  '), /preferences/);
});

test('Should_TruncateAndFlatten_When_PreviewingLongText', () => {
    const result = preview('a\n\nb '.repeat(50), 10);
    assert.equal(result.length, 10);
    assert.ok(result.endsWith('…'));
    assert.doesNotMatch(result, /\n/);
});

test('Should_OfferExtend_When_QueryMatchesExtend', () => {
    const { items } = buildStyleItems('ext', 'Gefeliciteerd Thomas', 'Selection');
    assert.deepEqual(items.map(item => item.arg), ['extend']);
    assert.match(buildUserPrompt('Gefeliciteerd Thomas', 'extend'), /^Task: Extend the text/);
});

test('Should_AskForEnglishImageToVideoPrompt_When_StyleIsVideo', () => {
    const { items } = buildStyleItems('video', 'Na een paar seconden de ogen knipperen.', 'Selection');
    assert.deepEqual(items.map(item => item.arg), ['video']);
    assert.match(buildUserPrompt('Na een paar seconden de ogen knipperen.', 'video'), /image-to-video model\. Write it in English/);
});

test('Should_AllowMarkdownOutput_When_StyleIsMarkdown', () => {
    assert.match(buildSystemPrompt('', 'markdown'), /Markdown source/);
    assert.doesNotMatch(buildSystemPrompt('', 'markdown'), /no markdown formatting/);
    assert.match(buildSystemPrompt('', 'improve'), /no markdown formatting/);
    assert.match(buildSystemPrompt('', 'custom'), /no markdown formatting/);
});

test('Should_AskToReviewHeadings_When_StyleIsMarkdown', () => {
    const { items } = buildStyleItems('markdown', '# Notes\n\nsome text', 'Selection');
    assert.deepEqual(items.map(item => item.arg), ['markdown', 'markdown-images']);
    assert.match(buildUserPrompt('# Notes', 'markdown'), /judge the heading structure/);
});

test('Should_KeepImagesAndCleanUp_When_StyleIsMarkdownImages', () => {
    const prompt = buildUserPrompt('![](img/step1.png)', 'markdown-images');
    assert.match(prompt, /judge the heading structure/);
    assert.match(prompt, /Keep every image and never change its path/);
    assert.match(buildSystemPrompt('', 'markdown-images'), /Markdown source/);
    assert.doesNotMatch(buildUserPrompt('# Notes', 'markdown'), /images/);
});

function promptsDir(files) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rewrite-prompts-'));
    for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), content);
    return dir;
}

test('Should_ReadFrontMatterAndBody_When_ParsingPromptFile', () => {
    const { meta, body } = parsePromptFile('---\ntitle: "Poem"\nmarkdown: true\n---\n\n<!-- note -->\nMake it rhyme.\n');
    assert.deepEqual(meta, { title: 'Poem', markdown: 'true' });
    assert.equal(body, 'Make it rhyme.');
});

test('Should_StripOrderPrefix_When_DerivingKeyFromFilename', () => {
    assert.equal(styleKeyFromFile('10-markdown.md'), 'markdown');
    assert.equal(styleKeyFromFile('poem.md'), 'poem');
});

test('Should_AddStyleInNumericOrder_When_MarkdownFileIsAdded', () => {
    const dir = promptsDir({ '10-b.md': '---\ntitle: B\n---\nDo B.', '2-a.md': '---\ntitle: A\nsubtitle: First\n---\nDo A.', 'notes.txt': 'ignored', '3-empty.md': '---\ntitle: Empty\n---\n' });
    assert.deepEqual(loadStyles(dir), [
        { key: 'a', title: 'A', subtitle: 'First', markdown: false, instruction: 'Do A.' },
        { key: 'b', title: 'B', subtitle: '', markdown: false, instruction: 'Do B.' }
    ]);
});

test('Should_PrependBaseInstruction_When_StyleExtendsAnother', () => {
    const dir = promptsDir({ '1-base.md': 'Base rules.', '2-more.md': '---\nextends: base\n---\nMore rules.' });
    assert.equal(loadStyles(dir)[1].instruction, 'Base rules.\n\nMore rules.');
});

test('Should_Throw_When_StyleExtendsUnknownStyle', () => {
    assert.throws(() => loadStyles(promptsDir({ 'x.md': '---\nextends: nope\n---\nX.' })), /x\.md: extends unknown style "nope"/);
});
