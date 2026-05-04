// GENERATED APP — fixture-01-syntax-error
// This file contains a deliberate syntax error for repair testing.
// The repair engine must detect and fix the unclosed object literal.

const http = require('http');
const PORT = parseInt(process.env.PORT || '33101', 10);

// INJECTED FAILURE: unclosed object literal causes SyntaxError at parse time
const BROKEN_CONFIG = {
  name: 'fixture-01',
  version: '1.0.0'
  // missing closing brace intentionally
;

const server = http.createServer(function(req, res) {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', fixture: 'fixture-01' }));
    return;
  }
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not found' }));
});

server.listen(PORT, '127.0.0.1', function() {
  process.stdout.write('fixture-01 server listening on ' + PORT + '\n');
});
