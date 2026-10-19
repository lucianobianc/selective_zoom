const { test } = require('node:test');
const assert = require('node:assert/strict');
require('../content/selectors.js');
const selectors = globalThis.SelectiveZoom.Selectors;
test('selector grammar accepts only generated bounded attribute/class selectors', () => {
  for (const value of ['p.comment-text', 'article.comment > p', 'p[id="content-text"]', 'p.comment.body', 'div[data-testid="comment-text"]']) assert.equal(selectors.valid(value), true, value);
  for (const value of ['*', 'p', 'body p', 'p.comment, input', 'p.comment { color:red }', '@import "https://evil.test"', 'p[data-test="x\\"]', '', null]) assert.equal(selectors.valid(value), false, String(value));
});
test('unstable class and id tokens are rejected', () => {
  for (const value of ['comment-text', 'body', 'content-text']) assert.equal(selectors.stableToken(value), true);
  for (const value of ['css-abcdef', 'jsx-abc', 'sc-AbCd', 'comment-123456', 'deadbeef', '']) assert.equal(selectors.stableToken(value), false);
});
