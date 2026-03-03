// lib/utils.js

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

function uniqueSlug(text) {
  return `${slugify(text)}-${Date.now().toString(36)}`;
}

module.exports = { slugify, uniqueSlug };
