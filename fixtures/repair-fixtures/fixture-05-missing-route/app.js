// GENERATED APP — fixture-05-missing-route
// Server starts and /health works, but /api/dashboard is missing.
// The repair engine must detect the 404 and add the missing route.

const http = require('http');
const PORT = parseInt(process.env.PORT || '33105', 10);

const server = http.createServer(function(req, res) {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', fixture: 'fixture-05' }));
    return;
  }
  // INJECTED FAILURE: /api/dashboard route not implemented
  // The repair engine will add the missing route above this catch-all
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not found' }));
});

server.listen(PORT, '127.0.0.1', function() {
  process.stdout.write('fixture-05 server listening on ' + PORT + '\n');
});
