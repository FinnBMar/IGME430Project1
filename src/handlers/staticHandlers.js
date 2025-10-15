const fs = require('fs');
const path = require('path');

const indexFile = fs.readFileSync(path.resolve(__dirname, '..', '..', 'client', 'client.html'));
const docsFile = fs.readFileSync(path.resolve(__dirname, '..', '..', 'client', 'docs.html'));
const cssFile = fs.readFileSync(path.resolve(__dirname, '..', '..', 'client', 'style.css'));

const sendFile = (response, status, contentType, fileBuffer, isHead = false) => {
  const headers = {
    'Content-Type': contentType,
    'Content-Length': Buffer.byteLength(fileBuffer),
  };
  response.writeHead(status, headers);
  if (isHead) {
    response.end();
    return;
  }
  response.write(fileBuffer);
  response.end();
};

const getIndex = (request, response) => sendFile(response, 200, 'text/html', indexFile);
const getDocs = (request, response) => sendFile(response, 200, 'text/html', docsFile);
const getCSS = (request, response) => sendFile(response, 200, 'text/css', cssFile);

const handleNotFound = (request, response) => {
  const body = JSON.stringify({ message: 'Resource not found', id: 'notFound' });
  response.writeHead(404, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) });
  response.write(body);
  response.end();
};

module.exports = {
  getIndex, getDocs, getCSS, handleNotFound,
};
