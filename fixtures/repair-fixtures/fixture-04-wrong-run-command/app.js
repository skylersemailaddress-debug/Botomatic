// GENERATED APP — fixture-04-wrong-run-command
// Source is correct. package.json start script references wrong filename.
// The repair engine must fix package.json scripts.start from "node server.js" to "node app.js".

const http = require('http');
const PORT = parseInt(process.env.PORT || '33104', 10);

const server = http.createServer(function(req, res) {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', fixture: 'fixture-04' }));
    return;
  }
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not found' }));
});

server.listen(PORT, '127.0.0.1', function() {
  process.stdout.write('fixture-04 server listening on ' + PORT + '\n');
});
