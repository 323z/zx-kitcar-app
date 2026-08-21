// ============================================================
//  Citroen ZX Kit Car Rally Sim v6.0 — Local Dev Server
//  Usage: node server.js  →  http://localhost:8080
// ============================================================
var http = require('http');
var fs   = require('fs');
var path = require('path');

var PORT    = process.env.PORT || 8080;
var WWW_DIR = path.join(__dirname, 'www');

var MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.ico':  'image/x-icon'
};

var server = http.createServer(function (req, res) {
  var urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';

  var filePath = path.join(WWW_DIR, urlPath);
  var ext  = path.extname(filePath);
  var type = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, function (err, data) {
    if (err) {
      res.writeHead(404, {'Content-Type': 'text/plain'});
      res.end('404 Not Found: ' + urlPath);
      console.log('[404]', urlPath);
    } else {
      res.writeHead(200, {'Content-Type': type});
      res.end(data);
      console.log('[200]', urlPath);
    }
  });
});

server.listen(PORT, function () {
  console.log('============================================');
  console.log('  Citroen ZX Kit Car Rally Sim v6.0');
  console.log('  Local Dev Server');
  console.log('============================================');
  console.log('  URL: http://localhost:' + PORT);
  console.log('  WWW: ' + WWW_DIR);
  console.log('  Press Ctrl+C to stop');
  console.log('============================================');
});
