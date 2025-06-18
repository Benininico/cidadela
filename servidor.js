const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

// Usa porta do Railway ou 3000 localmente
const port = process.env.PORT || 3000;

// Cria servidor HTTP para servir os arquivos do frontend
const server = http.createServer((req, res) => {
  // Define qual arquivo servir
  let filePath = path.join(__dirname, req.url === '/' ? 'portal.html' : req.url);

  // Protege contra diretórios inválidos
  if (filePath.includes('..')) {
    res.statusCode = 400;
    res.end('Bad Request');
    return;
  }

  // Define tipo MIME
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

// Cria servidor WebSocket sobre o HTTP
const wss = new WebSocket.Server({ server });

let clients = [];

wss.on('connection', (ws) => {
  clients.push(ws);
  console.log('🟢 Cliente conectado. Total:', clients.length);

  ws.on('message', (message) => {
    console.log('📨 Mensagem:', message.toString());
    // Envia para todos os outros clientes conectados
    clients.forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  ws.on('close', () => {
    clients = clients.filter(c => c !== ws);
    console.log('🔴 Cliente desconectado. Total:', clients.length);
  });
});

// Inicia o servidor
server.listen(port, () => {
  console.log(`🌐 Servidor rodando na porta ${port}`);
});
