const url = require('url');

const apiHandlers = require('./handlers/apiHandlers');
const staticHandlers = require('./handlers/staticHandlers');

const route = (request, response) => {
  const parsed = url.parse(request.url, true);
  const { pathname } = parsed;
  const { method } = request;

  // Static routes
  if (pathname === '/') return staticHandlers.getIndex(request, response);
  if (pathname === '/style.css') return staticHandlers.getCSS(request, response);
  if (pathname === '/docs') return staticHandlers.getDocs(request, response);

  // API routes
  // - path-style id: /api/pokemon/25
  const apiRegex = /^\/api\/(.*)/;
  const match = pathname.match(apiRegex);

  if (match) {
    const apiPath = `/${match[1]}`; // e.g., /pokemon or /pokemon/25
    // Route known API paths
    if (apiPath.startsWith('/pokemon')) {
      return apiHandlers.handlePokemon(request, response, parsed);
    }
    if (apiPath === '/types') {
      return apiHandlers.handleTypes(request, response, parsed);
    }

    return apiHandlers.handleNotFound(request, response);
  }

  // Not found for anything else
  return staticHandlers.handleNotFound(request, response);
};

module.exports = { route };
