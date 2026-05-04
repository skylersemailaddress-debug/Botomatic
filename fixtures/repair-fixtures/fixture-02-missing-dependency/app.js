// GENERATED APP — fixture-02-missing-dependency
// This file requires a module that does not exist.
// The repair engine must detect MODULE_NOT_FOUND and create the missing file.

const http = require('http');
// INJECTED FAILURE: lib/db-client.js does not exist in this workspace
const dbClient = require('./lib/db-client');

const PORT = parseInt(process.env.PORT || '33102', 10);

const server = http.createServer(function(req, res) {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', fixture: 'fixture-02' }));
    return;
  }
  if (req.url === '/api/status') {
    const status = dbClient.getStatus();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', db: status }));
    return;
  }
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not found' }));
});

server.listen(PORT, '127.0.0.1', function() {
  process.stdout.write('fixture-02 server listening on ' + PORT + '\n');
});
