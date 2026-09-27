const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// Serves repository files for the HTTP reader tests on 127.0.0.1:3000.
module.exports = async function () {
  const server = http.createServer((req, res) => {
    let filePath;
    try {
      const { pathname } = new URL(req.url, 'http://127.0.0.1');
      filePath = path.resolve(ROOT, `.${decodeURIComponent(pathname)}`);
    } catch {
      res.writeHead(400);
      res.end();
      return;
    }
    if (!filePath.startsWith(ROOT + path.sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    const stream = fs.createReadStream(filePath);
    res.setHeader('Access-Control-Allow-Origin', '*');
    stream.on('error', () => {
      res.writeHead(404);
      res.end();
    });
    stream.pipe(res);
  });

  await new Promise((resolve) => {
    server.listen(3000, '127.0.0.1', resolve);
  });

  return async function () {
    await new Promise((resolve) => {
      server.close(resolve);
    });
  };
};
