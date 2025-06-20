const https = require('https');    
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

// Porta para HTTPS
const port = process.env.PORT || 666;

// Carrega os arquivos do certificado da pasta acessível
const options = {
  key: fs.readFileSync(path.join(__dirname, 'certs', 'privkey.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'certs', 'fullchain.pem'))
};

// Cria servidor HTTPS para servir os arquivos do frontend
const server = https.createServer(options, (req, res) => {
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);

  if (filePath.includes('..')) {
    res.statusCode = 400;
    res.end('Bad Request');
    return;
  }

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

// Cria servidor WebSocket sobre o HTTPS
const wss = new WebSocket.Server({ server });

let clients = [];

wss.on('connection', (ws) => {
  clients.push(ws);
  console.log('🟢 Cliente conectado. Total:', clients.length);

  ws.on('message', (message) => {
    console.log('📨 Mensagem:', message.toString());
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

// Inicia o servidor HTTPS
server.listen(port, () => {
  console.log(`🌐 Servidor HTTPS rodando na porta ${port}`);
});
