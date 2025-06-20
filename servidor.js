const https = require('https');    
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const port = process.env.PORT || 666;

const options = {
  key: fs.readFileSync(path.join(__dirname, 'certs', 'privkey.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'certs', 'fullchain.pem'))
};

const server = https.createServer(options, (req, res) => {
  const ip = req.socket.remoteAddress;
  console.log(`📥 Acesso HTTP do IP: ${ip} - URL: ${req.url}`);

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

// Salas { roomCode: Set of ws clients }
const rooms = {};

function isValidRoomCode(code) {
  return typeof code === 'string' && /^[\w-]{1,64}$/.test(code);
}

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  ws.userIP = ip;
  ws.room = null;
  console.log(`🟢 Cliente conectado com IP: ${ip}`);

  ws.on('message', (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', message: 'JSON inválido.' }));
      return;
    }

    if (data.type === 'join') {
      const room = data.room;
      if (!isValidRoomCode(room)) {
        ws.send(JSON.stringify({ type: 'error', message: 'Código de sala inválido. Use só letras, números, - e _ (até 64 chars).' }));
        return;
      }
      if (ws.room) {
        if (rooms[ws.room]) {
          rooms[ws.room].delete(ws);
          if (rooms[ws.room].size === 0) delete rooms[ws.room];
        }
      }
      ws.room = room;
      if (!rooms[ws.room]) rooms[ws.room] = new Set();
      rooms[ws.room].add(ws);

      // Envia quantos clients na sala (para controlar isCaller)
      const clientsCount = rooms[ws.room].size;
      ws.send(JSON.stringify({ type: 'clientsCount', count: clientsCount }));

      console.log(`Cliente com IP ${ws.userIP} entrou na sala ${ws.room}`);
      return;
    }

    // Repassa mensagens signaling para clientes na mesma sala
    if (ws.room && rooms[ws.room]) {
      rooms[ws.room].forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    }
  });

  ws.on('close', () => {
    if (ws.room && rooms[ws.room]) {
      rooms[ws.room].delete(ws);
      if (rooms[ws.room].size === 0) {
        delete rooms[ws.room];
      }
      console.log(`Cliente com IP ${ws.userIP} saiu da sala ${ws.room}`);
    } else {
      console.log(`Cliente com IP ${ws.userIP} desconectou (sem sala)`);
    }
  });
});

server.listen(port, () => {
  console.log(`🌐 Servidor HTTPS rodando na porta ${port}`);
});
