const http = require('http');
const fs = require('fs');
const path = require('path');

const hostname = '0.0.0.0';
const port = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  // Caminho do arquivo index.html na mesma pasta do servidor.js
  const filePath = path.join(__dirname, 'index.html');

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Se der erro ao ler arquivo, retorna 500
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Erro ao carregar o arquivo.');
    } else {
      // Envia o conteúdo do index.html com header correto
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html');
      res.end(data);
    }
  });
});

server.listen(port, hostname, () => {
  console.log(`Servidor rodando em http://${hostname}:${port}/`);
});

