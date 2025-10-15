const http = require('http');
const router = require('./router');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

const server = http.createServer((req, res) => {
  try {
    router.route(req, res);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Unhandled server error:', err);
    const body = JSON.stringify({ message: 'Internal Server Error', id: 'internal' });
    res.writeHead(500, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body, 'utf8') });
    res.write(body);
    res.end();
  }
});

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on 127.0.0.1:${port}`);
});
