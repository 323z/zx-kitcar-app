// Citroen ZX Kit Car Sim v6.0 - Local Dev Server
var http = require('http');
var fs = require('fs');
var path = require('path');

var PORT = process.env.PORT || 8080;

var MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
};

var server = http.createServer(function (req, res) {
  var urlPath = req.url === '/' ? '/index.html' : req.url;
  var filePath = path.join(__dirname, urlPath);
  var ext = path.extname(filePath);
  var mime = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, function (err, data) {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found: ' + urlPath);
      console.log('[404] ' + urlPath);
    } else {
      res.writeHead(200, { 'Content-Type': mime });
      res.end(data);
      console.log('[200] ' + urlPath);
    }
  });
});

server.listen(PORT, function () {
  console.log('============================================');
  console.log('  Citroen ZX Kit Car Rally Sim v6.0');
  console.log('  Local Dev Server');
  console.log('============================================');
  console.log('  URL: http://localhost:' + PORT);
  console.log('  Open in browser to play');
  console.log('============================================');
});

// Auto-open browser (optional)
var child = require('child_process');
setTimeout(function () {
  try {
    child.exec('xdg-open http://localhost:' + PORT + ' 2>/dev/null || open http://localhost:' + PORT + ' 2>/dev/null || start http://localhost:' + PORT + ' 2>/dev/null');
  } catch (e) {}
}, 500);
