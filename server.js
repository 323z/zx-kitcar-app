// Simple Node.js server for local development
var http = require('http');
var fs = require('fs');
var path = require('path');

var PORT = process.env.PORT || 8080;
var ROOT = __dirname;

var MIME = {
  '.html': 'text/html', '.js': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg'
};

http.createServer(function(req, res) {
  var url = req.url === '/' ? '/index.html' : req.url;
  var fp = path.join(ROOT, url);
  var ext = path.extname(fp);
  var type = MIME[ext] || 'text/plain';

  fs.readFile(fp, function(err, data) {
    if (err) {
      res.writeHead(404); res.end('Not Found'); return;
    }
    res.writeHead(200, {'Content-Type': type});
    res.end(data);
  });
}).listen(PORT, function() {
  console.log('Citroen ZX Kit Car Sim v6.0');
  console.log('Open http://localhost:'+PORT);
});
