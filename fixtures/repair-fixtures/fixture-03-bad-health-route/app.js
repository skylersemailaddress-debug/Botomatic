// GENERATED APP — fixture-03-bad-health-route
// Server starts and runs correctly but /health returns 500.
// The repair engine must detect the bad status code and fix it to 200.

const http = require('http');
const PORT = parseInt(process.env.PORT || '33103', 10);

const server = http.createServer(function(req, res) {
  if (req.url === '/health') {
    // INJECTED FAILURE: should be 200 but returns 500
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'error', fixture: 'fixture-03', reason: 'injected_failure' }));
    return;
  }
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not found' }));
});

server.listen(PORT, '127.0.0.1', function() {
  process.stdout.write('fixture-03 server listening on ' + PORT + '\n');
});
