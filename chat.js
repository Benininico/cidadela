
const wsUrl = location.origin.replace(/^http/, 'ws');
let ws, pc, dc;
let isCaller = false; // só será true se for o segundo da sala
let room;

const chat = document.getElementById('chat');
const msgInput = document.getElementById('msg');
const sendBtn = document.getElementById('sendBtn');
const roomInput = document.getElementById('roomInput');
const joinBtn = document.getElementById('joinBtn');

msgInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault(); 
    if (!sendBtn.disabled) sendBtn.click();
  }
});

function log(text) {
    const p = document.createElement('p');
    p.textContent = text;
    chat.appendChild(p);
    chat.scrollTop = chat.scrollHeight;
}

joinBtn.onclick = () => {
    let input = roomInput.value.trim();

    if (input.length === 0) {
        alert('Digite um código de sala.');
        return;
    }
    if (input.length > 64) {
        alert('Código da sala deve ter no máximo 64 caracteres.');
        return;
    }
    if (!/^[\w-]{1,64}$/.test(input)) {
        alert('Código da sala só pode conter letras, números, hífen e underline.');
        return;
    }

    room = input;
    joinBtn.disabled = true;
    roomInput.disabled = true;
    start();
};

async function start() {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'join', room }));
        log('Conectado ao servidor de signaling na sala: ' + room);
        // esperar resposta clientsCount para decidir isCaller e criar conexão
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
            // Define quem cria offer (isCaller = segundo cliente)
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
        // Caller cria datachannel
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
        log('Conexão do chat aberta');
        chat.style.display = 'block';
        msgInput.disabled = false;
        sendBtn.disabled = false;
        msgInput.focus();
    };
    dc.onmessage = (event) => {
        log('Parceiro: ' + event.data);
    };
    dc.onclose = () => {
        log('Conexão do chat fechada');
        msgInput.disabled = true;
        sendBtn.disabled = true;
    };
}

sendBtn.onclick = () => {
    const text = msgInput.value.trim();
    if (text && dc && dc.readyState === 'open') {
        dc.send(text);
        log('Você: ' + text);
        msgInput.value = '';
    }
};