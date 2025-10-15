const path = require('path');

let pokedex = [];

/**
 * Load the pokedex data at module import time.
 * This reads the JSON once and keeps it in memory.
 */
const loadPokedex = () => {
  // eslint-disable-next-line global-require, import/no-dynamic-require
  const data = require(path.resolve(__dirname, '..', 'data', 'pokedex.json'));
  pokedex = Array.isArray(data) ? data : [];
};

/**
 * Get all pokemon with optional filters:
 *  - type: string (case-insensitive substring match inside types)
 *  - name: string (case-insensitive substring search)
 *  - limit: integer
 *  - offset: integer
 *
 * Returns { count, results }
 */
const getAll = (options = {}) => {
  const {
    type,
    name,
    limit = 50,
    offset = 0,
  } = options;

  let results = pokedex.slice();

  if (type && typeof type === 'string' && type.trim() !== '') {
    const t = type.trim().toLowerCase();
    results = results.filter((p) => Array.isArray(p.type) && p.type.some((ty) => ty.toLowerCase() === t));
  }

  if (name && typeof name === 'string' && name.trim() !== '') {
    const n = name.trim().toLowerCase();
    results = results.filter((p) => p.name && p.name.toLowerCase().includes(n));
  }

  const start = Number(offset) >= 0 ? Number(offset) : 0;
  const lim = Number(limit) > 0 ? Number(limit) : results.length;

  const paged = results.slice(start, start + lim);

  return {
    count: results.length,
    results: paged,
  };
};

/**
 * Get single pokemon by numeric id
 * Returns pokemon object or null if not found
 */
const getById = (id) => {
  const numericId = Number(id);
  if (Number.isNaN(numericId)) return null;

  return pokedex.find((p) => p.id === numericId) || null;
};

/**
 * Return a sorted array of unique types
 */
const getTypes = () => {
  const typeSet = new Set();

  pokedex.forEach((p) => {
    if (Array.isArray(p.type)) {
      p.type.forEach((t) => {
        if (t && typeof t === 'string') {
          typeSet.add(t);
        }
      });
    }
  });

  return Array.from(typeSet).sort();
};

// Load on require
loadPokedex();

module.exports = {
  getAll,
  getById,
  getTypes,
};
