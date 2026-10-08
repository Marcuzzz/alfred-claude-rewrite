const test = require('node:test');
const assert = require('node:assert/strict');
const { STYLES, buildStyleItems, buildSystemPrompt, buildUserPrompt, preview } = require('../prompts');

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
