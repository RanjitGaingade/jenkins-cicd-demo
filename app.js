const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello from Jenkins CI/CD!');
});

server.listen(3000, '0.0.0.0', () => {
  console.log('App listening on port 3000');
});
