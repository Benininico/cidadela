const http = require('http');
const { exec } = require('child_process');

const PORT = 3000;

http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/webhook') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });

    req.on('end', () => {
      console.log('Webhook recebido!');
      console.log('Payload:', body);

      try {
        const data = JSON.parse(body);
        console.log('Payload JSON:', data);
      } catch (e) {
        console.log('Não é JSON válido:', e.message);
      }

      exec('git pull origin main', (error, stdout, stderr) => {
        if (error) {
          console.error(`Erro no git pull: ${error.message}`);
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          return res.end(`Erro no pull: ${error.message}`);
        }
        console.log('git pull output:', stdout);
        if (stderr) {
          console.log('git pull stderr:', stderr);
        }

        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Atualizado com sucesso!');
      });
    });

  } else if ((req.method === 'GET') && (req.url === '/webhook' || req.url === '/')) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Servidor webhook ativo!');

  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
}).listen(PORT, () => {
  console.log(`Servidor webhook rodando na porta ${PORT}`);
});
