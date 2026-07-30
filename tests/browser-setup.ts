import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

export default async function () {
  const server = http.createServer((req, res) => {
    const filePath = path.join(__dirname, '..', req.url!);
    const stream = fs.createReadStream(filePath);
    res.setHeader('Access-Control-Allow-Origin', '*');
    stream.on('error', () => {
      res.writeHead(404);
      res.end();
    });
    stream.pipe(res);
  });

  await new Promise<void>((resolve) => {
    server.listen(3000, resolve);
  });

  return async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  };
}
