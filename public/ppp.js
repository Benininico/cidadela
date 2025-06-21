let buffer = "";
const ppp = "portal"; 
const maxBufferLength = 20; 

document.addEventListener("keydown", (e) => {
  if (e.key.length === 1) {
    buffer += e.key.toLowerCase(); 
    if (buffer.length > maxBufferLength) {
      buffer = buffer.slice(-maxBufferLength); 
    }

    if (buffer.includes(ppp)) {
      window.location.href = "/portal.html"; 
    }
  }
});