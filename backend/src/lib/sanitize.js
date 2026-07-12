// NFR10: sanitize all user-generated content (messages, reviews, resource
// descriptions) to prevent Cross-Site Scripting (XSS).
const sanitizeHtml = require('sanitize-html');

function clean(text) {
  if (typeof text !== 'string') return text;
  return sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} }).trim();
}

module.exports = { clean };
