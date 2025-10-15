const querystring = require('querystring');
const pokedex = require('../pokedex');

/* helper to send JSON with headers; supports HEAD by passing isHead:true */
const sendJson = (response, status, obj, isHead = false) => {
  const body = JSON.stringify(obj);
  const headers = {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body, 'utf8'),
  };
  response.writeHead(status, headers);
  if (isHead) {
    response.end();
    return;
  }
  response.write(body);
  response.end();
};

/* parse request body for POST: support JSON and x-www-form-urlencoded */
const parseRequestBody = (request) => new Promise((resolve, reject) => {
  let body = '';
  request.on('data', (chunk) => {
    body += chunk;
  });
  request.on('end', () => {
    const contentType = (request.headers['content-type'] || '').split(';')[0].trim();
    if (contentType === 'application/json') {
      try {
        const parsed = JSON.parse(body || '{}');
        resolve(parsed);
      } catch (err) {
        reject(new Error('Invalid JSON body'));
      }
      return;
    }
    // default: parse urlencoded
    const parsed = querystring.parse(body);
    resolve(parsed);
  });
  request.on('error', (err) => reject(err));
});

/* Handler for /api/pokemon and path-style /api/pokemon/:id */
const handlePokemon = async (request, response, parsedUrl) => {
  const { method } = request;

  // handle HEAD separately early if needed
  if (method === 'HEAD') {
    // Determine behavior based on query or path
    const query = parsedUrl.query || {};
    const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
    // pathParts e.g. ['api','pokemon','25']
    const idFromPath = pathParts.length >= 3 ? pathParts[2] : undefined;

    if (idFromPath || query.id) {
      const id = idFromPath || query.id;
      const found = pokedex.getById(id);
      if (!found) {
        const body = JSON.stringify({ message: 'Not found', id: 'notFound' });
        response.writeHead(404, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body, 'utf8') });
        response.end();
        return;
      }
      const bodyFake = JSON.stringify(found);
      response.writeHead(200, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyFake, 'utf8') });
      response.end();
      return;
    }

    // For list HEAD: compute results to determine Content-Length
    try {
      const opts = pokedex.parseQueryOptions(parsedUrl.query);
      const results = pokedex.getAll(opts);
      const fakeBody = JSON.stringify(results);
      response.writeHead(200, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(fakeBody, 'utf8') });
      response.end();
    } catch (err) {
      const errBody = JSON.stringify({ message: 'Bad request', id: 'badRequest' });
      response.writeHead(400, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(errBody, 'utf8') });
      response.end();
    }
    return;
  }

  // GET handlers
  if (method === 'GET') {
    const query = parsedUrl.query || {};
    const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
    const idFromPath = pathParts.length >= 3 ? pathParts[2] : undefined;

    // If id is present in path or query -> return single
    const id = idFromPath || query.id;
    if (id) {
      const found = pokedex.getById(id);
      if (!found) {
        sendJson(response, 404, { message: 'Not found', id: 'notFound' });
        return;
      }
      sendJson(response, 200, found);
      return;
    }

    // If search by name (query.name) with fuzzy fallback
    if (query.name) {
      const opts = pokedex.parseQueryOptions(query);
      // For name filter we call getAll which will do substring matches
      const result = pokedex.getAll(opts);
      if (result.count > 0) {
        sendJson(response, 200, result);
        return;
      }

      // No exact matches — try fuzzy suggestion
      const suggestion = pokedex.getByNameFuzzy(query.name, 3); // maxDistance 3
      if (suggestion) {
        sendJson(response, 200, {
          count: 0,
          results: [],
          suggestion: suggestion.name,
          distance: suggestion.distance,
          message: `No exact match for "${query.name}". Did you mean "${suggestion.name}"?`,
          id: 'closeMatch',
        });
        return;
      }

      // No fuzzy match either
      sendJson(response, 200, { count: 0, results: [] });
      return;
    }

    // Otherwise list handler with filters
    try {
      const opts = pokedex.parseQueryOptions(query);
      const results = pokedex.getAll(opts);
      sendJson(response, 200, results);
    } catch (err) {
      sendJson(response, 400, { message: err.message, id: 'badRequest' });
    }
    return;
  }

  // POST handlers (add or edit)
  if (method === 'POST') {
    // Path-style update: /api/pokemon/25
    const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
    const idFromPath = pathParts.length >= 3 ? pathParts[2] : undefined;

    try {
      const body = await parseRequestBody(request);
      const {
        name, num, img, type, height, weight, weaknesses,
      } = body;

      // Basic validation: create requires name & num at minimum
      if (!name || !num) {
        sendJson(response, 400, { message: 'Missing required fields: name and num', id: 'missingParams' });
        return;
      }

      // If idFromPath provided -> treat as update
      if (idFromPath) {
        const existing = pokedex.getById(idFromPath);
        if (!existing) {
          sendJson(response, 404, { message: 'Not found', id: 'notFound' });
          return;
        }
        // Update fields allowed: age => not relevant here; we'll update fields provided
        pokedex.updateById(idFromPath, {
          name, num, img, type, height, weight, weaknesses,
        });
        // 204 No Content signals success for update
        response.writeHead(204);
        response.end();
        return;
      }

      // Otherwise: create new pokemon (add to in-memory)
      const created = pokedex.addPokemon({
        name, num, img, type, height, weight, weaknesses,
      });

      // 201 Created
      sendJson(response, 201, { message: 'Pokemon created', id: created.id });
    } catch (err) {
      sendJson(response, 400, { message: err.message || 'Bad Request', id: 'badRequest' });
    }
    return;
  }

  // Other methods not allowed
  sendJson(response, 405, { message: 'Method Not Allowed', id: 'methodNotAllowed' });
};

const handleTypes = (request, response) => {
  if (request.method === 'HEAD') {
    const types = pokedex.getTypes();
    const fakeBody = JSON.stringify({ count: types.length, types });
    response.writeHead(200, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(fakeBody, 'utf8') });
    response.end();
    return;
  }

  if (request.method === 'GET') {
    const types = pokedex.getTypes();
    sendJson(response, 200, { count: types.length, types });
    return;
  }

  sendJson(response, 405, { message: 'Method Not Allowed', id: 'methodNotAllowed' });
};

const handleNotFound = (request, response) => {
  sendJson(response, 404, { message: 'API endpoint not found', id: 'notFound' });
};

module.exports = {
  handlePokemon,
  handleTypes,
  handleNotFound,
};
