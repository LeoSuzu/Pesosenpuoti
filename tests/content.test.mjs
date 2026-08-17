import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { validateSiteContent } from '../content/schema.js';

const content = JSON.parse(await readFile(new URL('../content/site.json', import.meta.url), 'utf8'));

test('site content accepts the four public services and rejects a missing image alt', () => {
  assert.deepEqual(validateSiteContent(content), { valid: true, issues: [] });
  const invalid = structuredClone(content);
  invalid.services[0].imageAlt = '';
  assert.deepEqual(validateSiteContent(invalid), {
    valid: false,
    issues: ['services[0].imageAlt is required'],
  });
});
