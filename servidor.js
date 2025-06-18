const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const hostname = '0.0.0.0';
const port = process.env.PORT || 3000;

// Cria servidor HTTP que serve arquivos estáticos
const server = http.createServer((req, res) => {
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);

  // Protege contra diretórios inválidos
  if (filePath.includes('..')) {
    res.statusCode = 400;
    res.end('Bad Request');
    return;
  }

  // Define tipo MIME baseado na extensão do arquivo
  const ext = path.extname(filePath);
  const contentType = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml',
  }[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Arquivo não encontrado');
    } else {
      res.statusCode = 200;
      res.setHeader('Content-Type', contentType);
      res.end(content);
    }
  });
});

// Integra WebSocket ao servidor HTTP
const wss = new WebSocket.Server({ server });

let clients = [];

wss.on('connection', (ws) => {
  clients.push(ws);
  console.log('Cliente conectado. Total:', clients.length);

  ws.on('message', (message) => {
    // Broadcast para todos exceto quem enviou
    clients.forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  ws.on('close', () => {
    clients = clients.filter(c => c !== ws);
    console.log('Cliente desconectado. Total:', clients.length);
  });
});

server.listen(port, hostname, () => {
  console.log(`Servidor rodando em http://${hostname}:${port}/`);
});
