const wsUrl = location.origin.replace(/^http/, 'ws');
let ws, pc, dc;
let isCaller = false;
let room;
let username;

const chat = document.getElementById('chat');
const msgInput = document.getElementById('msg');
const sendBtn = document.getElementById('sendBtn');
const roomInput = document.getElementById('roomInput');
const joinBtn = document.getElementById('joinBtn');
const usernameInput = document.getElementById('usernameInput'); // novo campo username

function log(text) {
  const p = document.createElement('p');
  p.classList.add('chat-message'); // para alinhar à esquerda via CSS
  p.textContent = text;
  chat.appendChild(p);
  chat.scrollTop = chat.scrollHeight;
}

joinBtn.onclick = () => {
  const inputRoom = roomInput.value.trim();
  const inputUser = usernameInput.value.trim();

  if (!inputRoom) {
    alert('Digite um código de sala.');
    return;
  }
  if (inputRoom.length > 64) {
    alert('Código da sala deve ter no máximo 64 caracteres.');
    return;
  }
  if (!/^[\w-]{1,64}$/.test(inputRoom)) {
    alert('Código da sala só pode conter letras, números, hífen e underline.');
    return;
  }
  if (!inputUser) {
    alert('Digite um nome de usuário.');
    return;
  }
  if (inputUser.length > 32) {
    alert('Nome de usuário deve ter no máximo 32 caracteres.');
    return;
  }

  room = inputRoom;
  username = inputUser;

  joinBtn.disabled = true;
  roomInput.disabled = true;
  usernameInput.disabled = true;

  start();
};

async function start() {
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: 'join', room, username }));
    log(`Conectado ao servidor de signaling na sala: ${room} como ${username}`);
  };

  ws.onmessage = async (event) => {
    let dataStr;
    if (typeof event.data === 'string') {
      dataStr = event.data;
    } else if (event.data instanceof Blob) {
      dataStr = await event.data.text();
    } else {
      console.warn('Mensagem WS inesperada:', event.data);
      return;
    }

    const data = JSON.parse(dataStr);

    if (data.type === 'error') {
      alert('Erro do servidor: ' + data.message);
      return;
    }

    if (data.type === 'clientsCount') {
      isCaller = (data.count === 2);
      console.log('isCaller:', isCaller);

      createPeerConnection();

      if (isCaller) {
        createOffer();
      }
      return;
    }

    if (data.type === 'offer') {
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      ws.send(JSON.stringify({ type: 'answer', answer, room }));
      return;
    }

    if (data.type === 'answer') {
      await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
      return;
    }

    if (data.type === 'candidate') {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (e) {
        console.error('Erro ao adicionar candidato ICE', e);
      }
      return;
    }
  };

  ws.onclose = () => {
    log('Conexão com signaling fechada');
    msgInput.disabled = true;
    sendBtn.disabled = true;
  };
}

function createPeerConnection() {
  pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      ws.send(JSON.stringify({ type: 'candidate', candidate: event.candidate, room }));
    }
  };

  pc.ondatachannel = (event) => {
    dc = event.channel;
    setupDataChannel();
  };

  if (isCaller) {
    dc = pc.createDataChannel('chat');
    setupDataChannel();
  }
}

function createOffer() {
  pc.createOffer().then(offer => {
    pc.setLocalDescription(offer);
    ws.send(JSON.stringify({ type: 'offer', offer, room }));
  });
}

function setupDataChannel() {
  dc.onopen = () => {
    log('🟢 Conexão P2P estabelecida.');
    chat.style.display = 'block';
    msgInput.disabled = false;
    sendBtn.disabled = false;
    msgInput.focus();
  };

  dc.onmessage = (event) => {
    try {
      const { username: remoteUser, text } = JSON.parse(event.data);
      log(remoteUser + ': ' + text);
    } catch {
      log('Parceiro: ' + event.data);
    }
  };

  dc.onclose = () => {
    log('🔴 Conexão do chat fechada');
    msgInput.disabled = true;
    sendBtn.disabled = true;
  };
}

sendBtn.onclick = () => {
  const text = msgInput.value.trim();
  if (text && dc && dc.readyState === 'open') {
    const payload = JSON.stringify({ username, text });
    dc.send(payload);
    log(username + ': ' + text);
    msgInput.value = '';
  }
};

msgInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    if (!sendBtn.disabled) sendBtn.click();
  }
});
