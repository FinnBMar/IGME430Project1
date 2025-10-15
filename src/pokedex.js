const path = require('path');

// load the JSON
// eslint-disable-next-line global-require, import/no-dynamic-require
const raw = require(path.resolve(__dirname, '..', 'data', 'pokedex.json'));
const pokedex = Array.isArray(raw) ? raw.slice() : [];

// Basic incremental id tracker (pokedex already includes id,
// but for new adds we'll set id = max+1)
let nextId = pokedex.reduce((max, p) => (p.id > max ? p.id : max), 0) + 1;

/* Levenshtein distance implementation (pure JS, no packages) */
const levenshtein = (a, b) => {
  const aLen = a.length;
  const bLen = b.length;
  if (aLen === 0) return bLen;
  if (bLen === 0) return aLen;

  // remove unused params in callback to satisfy no-unused-vars
  const matrix = Array.from({ length: bLen + 1 }, () => Array(aLen + 1).fill(0));

  for (let i = 0; i <= bLen; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= aLen; j += 1) matrix[0][j] = j;

  for (let i = 1; i <= bLen; i += 1) {
    for (let j = 1; j <= aLen; j += 1) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[bLen][aLen];
};

/* ---------- Helpers ---------- */

const toArray = (val) => {
  if (Array.isArray(val)) return val;
  if (val === undefined || val === null || val === '') return [];
  return [val];
};

/* parse query options for /api/pokemon */
const parseQueryOptions = (query) => {
  const opts = {
    type: query.type || undefined,
    name: query.name || undefined,
    limit: query.limit ? Number(query.limit) : 50,
    offset: query.offset ? Number(query.offset) : 0,
  };

  if (Number.isNaN(opts.limit) || opts.limit < 0) {
    throw new Error('Invalid limit parameter');
  }
  if (Number.isNaN(opts.offset) || opts.offset < 0) {
    throw new Error('Invalid offset parameter');
  }

  return opts;
};

const getAll = (options = {}) => {
  const {
    type, name, limit = 50, offset = 0,
  } = options;

  let results = pokedex.slice();

  if (type && typeof type === 'string' && type.trim() !== '') {
    const t = type.trim().toLowerCase();
    results = results.filter(
      (p) => Array.isArray(p.type)
        && p.type.some((ty) => ty.toLowerCase() === t),
    );
  }

  if (name && typeof name === 'string' && name.trim() !== '') {
    const n = name.trim().toLowerCase();
    results = results.filter(
      (p) => p.name && p.name.toLowerCase().includes(n),
    );
  }

  const start = Number(offset) >= 0 ? Number(offset) : 0;

  let lim = Number(limit);
  if (Number.isNaN(lim) || lim <= 0) {
    lim = results.length;
  }

  const paged = results.slice(start, start + lim);

  return {
    count: results.length,
    results: paged,
  };
};

const getById = (id) => {
  const n = Number(id);
  if (Number.isNaN(n)) return null;
  return pokedex.find((p) => p.id === n) || null;
};

const getTypes = () => {
  const typeSet = new Set();

  pokedex.forEach((p) => {
    if (Array.isArray(p.type)) {
      p.type.forEach((t) => {
        if (t && typeof t === 'string') typeSet.add(t);
      });
    }
  });

  return Array.from(typeSet).sort();
};

/* Add new pokemon (in-memory)
   Accepts: { name, num, img, type, height, weight, weaknesses }
   Returns the created object (with assigned id). */
const addPokemon = (payload) => {
  const newPokemon = {
    id: nextId,
    num: payload.num,
    name: payload.name,
    img: payload.img || '',
    type: toArray(payload.type),
    height: payload.height || '',
    weight: payload.weight || '',
    weaknesses: toArray(payload.weaknesses),
  };

  pokedex.push(newPokemon);
  nextId += 1;
  return newPokemon;
};

/* Update by id (fields provided will overwrite) */
const updateById = (id, payload) => {
  const existing = getById(id);
  if (!existing) return null;

  if (payload.name) existing.name = payload.name;
  if (payload.num) existing.num = payload.num;

  if (payload.img !== undefined) {
    existing.img = payload.img;
  }

  if (payload.type !== undefined) {
    existing.type = toArray(payload.type);
  }

  if (payload.height !== undefined) {
    existing.height = payload.height;
  }

  if (payload.weight !== undefined) {
    existing.weight = payload.weight;
  }

  if (payload.weaknesses !== undefined) {
    existing.weaknesses = toArray(payload.weaknesses);
  }

  return existing;
};

/* Fuzzy name search: returns best match { name, id, distance } or null */
const getByNameFuzzy = (inputName, maxDistance = 2) => {
  if (!inputName || typeof inputName !== 'string') return null;

  const n = inputName.trim().toLowerCase();
  let best = null;

  for (let idx = 0; idx < pokedex.length; idx += 1) {
    const p = pokedex[idx];
    const nameLower = (p.name || '').toLowerCase();
    const dist = levenshtein(nameLower, n);

    if (dist <= maxDistance) {
      if (!best || dist < best.distance) {
        best = { id: p.id, name: p.name, distance: dist };
        if (dist === 0) break; // exact match
      }
    }
  }

  return best;
};

module.exports = {
  parseQueryOptions,
  getAll,
  getById,
  getTypes,
  addPokemon,
  updateById,
  getByNameFuzzy,
};
