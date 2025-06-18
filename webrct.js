let pc = new RTCPeerConnection();
let channel;
let chatBox = document.getElementById('chat');

pc.ondatachannel = e => {
    channel = e.channel;
    channel.onmessage = e => {
        chatBox.textContent += "Outro: " + e.data + "\n";
        chatBox.scrollTop = chatBox.scrollHeight;
    };
};

function createOffer() {
    channel = pc.createDataChannel("chat");
    channel.onmessage = e => {
        chatBox.textContent += "Outro: " + e.data + "\n";
        chatBox.scrollTop = chatBox.scrollHeight;
    };
    pc.createOffer().then(offer => {
        pc.setLocalDescription(offer);
        document.getElementById('localSDP').value = JSON.stringify(offer);
    });
}

function createAnswer() {
    let remote = JSON.parse(document.getElementById('remoteSDP').value);
    pc.setRemoteDescription(new RTCSessionDescription(remote)).then(() => {
        return pc.createAnswer();
    }).then(answer => {
        pc.setLocalDescription(answer);
        document.getElementById('localSDP').value = JSON.stringify(answer);
    });
}

document.getElementById('remoteSDP').addEventListener('input', () => {
    let remote = JSON.parse(document.getElementById('remoteSDP').value);
    pc.setRemoteDescription(new RTCSessionDescription(remote));
});

function sendMessage() {
    const msg = document.getElementById('msgInput').value;
    if (channel && msg) {
        channel.send(msg);
        chatBox.textContent += "Você: " + msg + "\n";
        chatBox.scrollTop = chatBox.scrollHeight;
        document.getElementById('msgInput').value = "";
    }
}