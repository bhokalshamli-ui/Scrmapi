const socket = io();

socket.on('scan-output', (data) => {
    appendOutput('nmap-output', data.data);
});

socket.on('scan-error', (data) => {
    appendOutput('nmap-output', `ERROR: ${data.data}`);
});

socket.on('nikto-output', (data) => {
    appendOutput('nikto-output', data.data);
});

function appendOutput(elementId, text) {
    const output = document.getElementById(elementId);
    output.textContent += text;
    output.scrollTop = output.scrollHeight;
}

async function runNmap() {
    const target = document.getElementById('nmap-target').value;
    const options = document.getElementById('nmap-options').value;
    
    if (!target) {
        alert('Please enter a target');
        return;
    }

    document.getElementById('nmap-output').textContent = 'Starting Nmap scan...\n';
    
    try {
        const response = await fetch('/api/scan/nmap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target, options })
        });
        
        const result = await response.json();
        console.log('Nmap scan started:', result);
    } catch (error) {
        console.error('Nmap error:', error);
        document.getElementById('nmap-output').textContent += `Error: ${error.message}\n`;
    }
}

async function runNikto() {
    const target = document.getElementById('nikto-target').value;
    
    if (!target) {
        alert('Please enter a target');
        return;
    }

    document.getElementById('nikto-output').textContent = 'Starting Nikto scan...\n';
    
    try {
        const response = await fetch('/api/scan/nikto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target })
        });
        
        const result = await response.json();
        console.log('Nikto scan started:', result);
    } catch (error) {
        console.error('Nikto error:', error);
        document.getElementById('nikto-output').textContent += `Error: ${error.message}\n`;
    }
}
