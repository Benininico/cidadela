const chat = document.getElementById('chat');
        const msgInput = document.getElementById('msgInput');
        const sendBtn = document.getElementById('sendBtn');

        const ws = new WebSocket(`wss://${window.location.host}`);

        const pc = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        });

        let dataChannel;

        ws.onopen = () => {
            log('Conectado ao servidor de sinalização.');
        };

        ws.onmessage = async (event) => {
            const message = JSON.parse(event.data);

            if (message.type === 'offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(message));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                ws.send(JSON.stringify(pc.localDescription));
            } else if (message.type === 'answer') {
                await pc.setRemoteDescription(new RTCSessionDescription(message));
            } else if (message.type === 'candidate') {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
                } catch (e) {
                    console.error('Erro ao adicionar ICE candidate:', e);
                }
            }
        };

        pc.onicecandidate = event => {
            if (event.candidate) {
                ws.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
            }
        };

        pc.ondatachannel = event => {
            dataChannel = event.channel;
            setupDataChannel();
        };

        function setupDataChannel() {
            dataChannel.onopen = () => {
                log('Canal de dados aberto! Pode enviar mensagens.');
                sendBtn.disabled = false;
                msgInput.focus();
            };
            dataChannel.onmessage = event => {
                log('Outro: ' + event.data);
            };
            dataChannel.onclose = () => {
                log('Canal de dados fechado.');
                sendBtn.disabled = true;
            };
        }

        // Criar canal de dados e oferta quando o WebSocket abrir (primeiro cliente)
        ws.onopen = () => {
            if (!dataChannel) {
                dataChannel = pc.createDataChannel('chat');
                setupDataChannel();

                pc.createOffer().then(offer => {
                    return pc.setLocalDescription(offer);
                }).then(() => {
                    ws.send(JSON.stringify(pc.localDescription));
                });
            }
        };

        sendBtn.onclick = () => {
            const msg = msgInput.value.trim();
            if (msg && dataChannel && dataChannel.readyState === 'open') {
                dataChannel.send(msg);
                log('Você: ' + msg);
                msgInput.value = '';
                msgInput.focus();
            }
        };

        function log(text) {
            chat.textContent += text + '\n';
            chat.scrollTop = chat.scrollHeight;
        }