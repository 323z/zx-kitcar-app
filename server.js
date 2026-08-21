// ============================================================
//  Citroen ZX Kit Car Rally Sim - Node.js Server
//  Compatible with Node.js 5.8
//  Serves the game files for local development
// ============================================================
var http = require('http');
var fs = require('fs');
var path = require('path');

var PORT = process.env.PORT || 8080;

var MIME_TYPES = {
    '.html': 'text/html',
    '.js':   'application/javascript',
    '.css':  'text/css',
    '.json': 'application/json',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.gif':  'image/gif',
    '.ico':  'image/x-icon',
    '.svg':  'image/svg+xml'
};

var server = http.createServer(function(req, res) {
    var urlPath = req.url === '/' ? '/index.html' : req.url;
    var filePath = path.join(__dirname, urlPath);
    var ext = path.extname(filePath);
    var contentType = MIME_TYPES[ext] || 'text/plain';

    fs.readFile(filePath, function(err, data) {
        if (err) {
            res.writeHead(404, {'Content-Type': 'text/plain'});
            res.end('404 Not Found: ' + urlPath);
            console.log('[404] ' + urlPath);
        } else {
            res.writeHead(200, {'Content-Type': contentType + '; charset=utf-8'});
            res.end(data);
            console.log('[200] ' + urlPath);
        }
    });
});

server.listen(PORT, function() {
    console.log('');
    console.log('============================================');
    console.log('  Citroen ZX Kit Car Rally Sim v6.0');
    console.log('  Node.js Server (v' + process.version + ')');
    console.log('  Listening on http://localhost:' + PORT);
    console.log('============================================');
    console.log('');
    console.log('  Controls:');
    console.log('    G = Throttle   B = Brake    Space = Handbrake');
    console.log('    + = Shift Up   - = Shift Dn  C = Clutch(HOLD)');
    console.log('    I = Ignition   P = Boost    R = Reset  Q = Quit');
    console.log('');
    console.log('  PUSH-START: When engine is dead,');
    console.log('  gain speed, shift to 1-2, release clutch [C]');
    console.log('');
});

// Graceful shutdown
process.on('SIGTERM', function() {
    console.log('\nShutting down...');
    server.close(function() { process.exit(0); });
});
process.on('SIGINT', function() {
    console.log('\nShutting down...');
    server.close(function() { process.exit(0); });
});
