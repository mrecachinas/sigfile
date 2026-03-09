const http = require('http');
const fs = require('fs');
const path = require('path');

module.exports = async function () {
  const server = http.createServer((req, res) => {
    const filePath = path.join(__dirname, '..', req.url);
    const stream = fs.createReadStream(filePath);
    res.setHeader('Access-Control-Allow-Origin', '*');
    stream.on('error', () => {
      res.writeHead(404);
      res.end();
    });
    stream.pipe(res);
  });

  await new Promise((resolve) => {
    server.listen(3000, resolve);
  });

  return async function () {
    await new Promise((resolve) => {
      server.close(resolve);
    });
  };
};
