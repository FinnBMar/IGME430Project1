const fs = require('fs');
const path = require('path');

const indexPath = path.resolve(__dirname, '..', 'client', 'client.html');
const docsPath = path.resolve(__dirname, '..', 'client', 'docs.html');
const cssPath = path.resolve(__dirname, '..', 'client', 'style.css');

const indexFile = fs.readFileSync(indexPath);
const docsFile = fs.readFileSync(docsPath);
const cssFile = fs.readFileSync(cssPath);

const sendFile = (response, status, contentType, buf) => {
  response.writeHead(status, {
    'Content-Type': contentType,
    'Content-Length': Buffer.byteLength(buf),
  });
  response.write(buf);
  response.end();
};

const getIndex = (request, response) => sendFile(response, 200, 'text/html', indexFile);
const getDocs = (request, response) => sendFile(response, 200, 'text/html', docsFile);
const getCSS = (request, response) => sendFile(response, 200, 'text/css', cssFile);

module.exports = {
  getIndex,
  getDocs,
  getCSS,
};
