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
test('scoped social selectors are accepted without allowing arbitrary CSS', () => {
  for (const value of ['ytd-comment-view-model yt-attributed-string[id="content-text"]', 'div[data-ad-rendering-role="comment_message"]', 'div[role="article"] > div > div.x193iq5w.x1lliihq', 'span[data-testid="UFI2Comment/body"]']) assert.equal(selectors.valid(value), true, value);
  for (const value of ['body > div > span', 'div[role="article"] *', 'div[onclick="alert"]', 'div[role="article"] span:hover', 'div[data-testid="x"];body{display:none}', 'div[role="article"] > input,body']) assert.equal(selectors.valid(value), false, value);
});
test('modal scope allows only known presence attributes', () => {
  for (const value of ['dialog[open] div[data-ad-rendering-role="comment_message"]', 'div[role="dialog"] p.comment-text', 'div[popover] p.comment-text']) assert.equal(selectors.valid(value), true, value);
  for (const value of ['div[onclick] p.comment-text', 'dialog[open] p.comment-text,body', 'dialog[open] p:hover']) assert.equal(selectors.valid(value), false, value);
});
