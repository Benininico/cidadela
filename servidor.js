const https = require('https');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

// Função para hora
function hora() {
  const agora = new Date();
  return agora.toTimeString().split(' ')[0].slice(0, 5);
}

// HTTPS com certificado seguro
const port = parseInt(process.argv[2], 10) || process.env.PORT || 666;

const options = {
  key: fs.readFileSync(path.join(__dirname, 'private', 'certs', 'privkey.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'private', 'certs', 'fullchain.pem'))
};

// Notifica acesso a estas páginas
const pagesToNotify = ['index.html', 'chat.html', 'portal.html'];

// Servidor HTTPS
const server = https.createServer(options, (req, res) => {
  const ip = req.socket.remoteAddress;
  const requested = req.url === '/' ? 'index.html' : req.url.replace(/^\//, '');
  const filePath = path.join(__dirname, 'public', requested);

  // Notifica acessos importantes
  if (pagesToNotify.includes(requested)) {
    console.log(`${hora()}: 🟢 Cliente acessou ${requested} com IP: ${ip}`);
  }

  // Proteção contra path traversal
  if (filePath.includes('..') || filePath.includes('/private/')) {
    res.statusCode = 403;
    res.end('Acesso negado');
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
    '.svg': 'image/svg+xml'
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

// WebSocket
const wss = new WebSocket.Server({ server });
let clients = [];

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  ws.userIP = ip;
  ws.room = null;
  clients.push(ws);
  console.log(`${hora()}: 🟢 Cliente conectado com IP: ${ip}`);

  ws.on('message', (msg) => {
    let data;
    try {
      data = JSON.parse(msg.toString());
    } catch {
      console.log(`${hora()}: ⚠️ Mensagem inválida`);
      return;
    }

    if (data.type === 'join' && typeof data.room === 'string') {
      ws.room = data.room.slice(0, 64);
      console.log(`${hora()}: 🚪 Cliente com IP: ${ws.userIP} entrou na sala: ${ws.room}`);
      const sameRoomClients = clients.filter(c => c.room === ws.room);
      ws.send(JSON.stringify({ type: 'clientsCount', count: sameRoomClients.length }));
    }

    if (['offer', 'answer', 'candidate'].includes(data.type)) {
      clients.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN && client.room === ws.room) {
          client.send(msg.toString());
        }
      });
    }
  });

  ws.on('close', () => {
    clients = clients.filter(c => c !== ws);
    console.log(`${hora()}: 🔴 Cliente com IP: ${ws.userIP} saiu da sala: ${ws.room || 'desconhecida'}`);
  });
});

server.listen(port, () => {
  console.log(`${hora()}: 🌐 Servidor HTTPS rodando na porta ${port}`);
});
