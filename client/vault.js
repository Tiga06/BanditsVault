function getVaultIdFromURL() {
    const pathParts = window.location.pathname.split('/');
    return pathParts[pathParts.length - 1];
}

function getAccessTokenFromHash() {
    return window.location.hash.substring(1);
}

function decryptKeyMaterial(encryptedKeyBlobB64, blobIvB64, token) {
    const derivedKey = CryptoJS.SHA256(token);
    const blobIv = CryptoJS.enc.Base64.parse(blobIvB64);
    const decrypted = CryptoJS.AES.decrypt(encryptedKeyBlobB64, derivedKey, { iv: blobIv });
    const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8);
    
    const [keyB64, ivB64] = decryptedStr.split('|');
    const key = CryptoJS.enc.Base64.parse(keyB64);
    const iv = CryptoJS.enc.Base64.parse(ivB64);
    
    return { key, iv };
}

function decryptContent(encryptedContent, key, iv) {
    const decrypted = CryptoJS.AES.decrypt(encryptedContent, key, { iv: iv });
    return decrypted.toString(CryptoJS.enc.Utf8);
}

async function accessVault(pin = null) {
    const vaultId = getVaultIdFromURL();
    const accessToken = getAccessTokenFromHash();
    
    if (!vaultId || !accessToken) {
        showError('Invalid vault link');
        return;
    }
    
    try {
        const url = `/api/vault/${vaultId}${pin ? `?pin=${pin}` : ''}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (!response.ok) {
            if (response.status === 401) {
                if (pin) {
                    showNotification('Invalid PIN. Please try again.', 'error');
                    document.getElementById('pinInput').value = '';
                    document.getElementById('pinInput').focus();
                    return;
                }
                showPinPrompt();
                return;
            }
            throw new Error(data.error || 'Failed to access vault');
        }
        
        const { key, iv } = decryptKeyMaterial(data.encryptedKeyBlob, data.blobIv, accessToken);
        const decryptedContent = decryptContent(data.encryptedContent, key, iv);
        
        displayContent(decryptedContent, data.contentType);
        startCountdown(data.destructTimer || 120);
        
    } catch (error) {
        showError(error.message);
    }
}

function showPinPrompt() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('pinPrompt').style.display = 'block';
    document.getElementById('pinInput').focus();
}

function displayContent(content, contentType) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('content').style.display = 'block';
    
    const contentDiv = document.getElementById('vaultContent');
    
    if (contentType === 'text') {
        contentDiv.innerHTML = `<div class="content-display">${content}</div>`;
    } else if (contentType === 'image') {
        contentDiv.innerHTML = `<div class="media-display"><img src="${content}" alt="Decrypted Image"></div>`;
    } else if (contentType === 'video') {
        contentDiv.innerHTML = `<div class="media-display"><video controls src="${content}"></video></div>`;
    }
}

function showError(message) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('error').innerHTML = `<div class="error">❌ ${message}</div>`;
    document.getElementById('error').style.display = 'block';
}

document.getElementById('pinInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const pin = document.getElementById('pinInput').value;
        if (pin.length === 4 && /^\d{4}$/.test(pin)) {
            accessVault(pin);
        } else {
            showNotification('PIN must be exactly 4 digits', 'error');
        }
    }
});

let countdownInterval;

function startCountdown(seconds = 120) {
    let timeLeft = seconds;
    const countdownElement = document.getElementById('countdown');
    
    countdownInterval = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        countdownElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        if (timeLeft <= 0) {
            clearInterval(countdownInterval);
            destroyVault();
        }
        timeLeft--;
    }, 1000);
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 100);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
}

function manualDestruct() {
    if (confirm('Are you sure you want to destroy this vault now?')) {
        clearInterval(countdownInterval);
        destroyVault();
    }
}

function destroyVault() {
    document.body.innerHTML = `
        <div class="destruction-scene">
            <div class="destruction-container">
                <img src="/vault.png" alt="Vault" class="destroyed-logo">
                <h1 class="destruction-title">VAULT DESTROYED</h1>
                <div class="destruction-message">
                    <p>The treasure has vanished into the digital abyss.</p>
                    <p>No trace remains of what once was...</p>
                </div>
                <a href="/" class="destruction-btn">
                    <span>⌂</span>
                    Return to Den
                </a>
            </div>
        </div>
    `;
}

window.onload = () => {
    accessVault();
};