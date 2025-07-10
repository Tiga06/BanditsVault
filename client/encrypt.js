function toggleContentInput() {
    const contentType = document.getElementById('contentType').value;
    const textInput = document.getElementById('textInput');
    const fileInput = document.getElementById('fileInput');
    
    if (contentType === 'text') {
        textInput.style.display = 'block';
        fileInput.style.display = 'none';
    } else {
        textInput.style.display = 'none';
        fileInput.style.display = 'block';
    }
}

function togglePinInput() {
    const pinToggle = document.getElementById('pinToggle');
    const pinInput = document.getElementById('pin');
    
    if (pinToggle.checked) {
        pinInput.disabled = false;
        pinInput.classList.remove('pin-disabled');
        pinInput.focus();
    } else {
        pinInput.disabled = true;
        pinInput.classList.add('pin-disabled');
        pinInput.value = '';
    }
}

function generateKey() {
    return CryptoJS.lib.WordArray.random(256/8);
}

function generateIV() {
    return CryptoJS.lib.WordArray.random(128/8);
}

function generateAccessToken(length = 12) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < length; i++) {
        token += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return token;
}

function encryptContent(content, key, iv) {
    return CryptoJS.AES.encrypt(content, key, { iv: iv }).toString();
}

function encryptKeyMaterial(key, iv, accessToken) {
    const keyBlob = key.toString(CryptoJS.enc.Base64) + '|' + iv.toString(CryptoJS.enc.Base64);
    const derivedKey = CryptoJS.SHA256(accessToken);
    const blobIv = CryptoJS.lib.WordArray.random(128/8);
    const encrypted = CryptoJS.AES.encrypt(keyBlob, derivedKey, { iv: blobIv });
    
    return {
        encryptedKeyBlob: encrypted.toString(),
        blobIv: blobIv.toString(CryptoJS.enc.Base64)
    };
}

async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// File upload handlers
const fileUpload = document.getElementById('fileUpload');
const fileDropZone = document.getElementById('fileDropZone');
const fileStatus = document.getElementById('fileStatus');

fileDropZone.addEventListener('click', () => fileUpload.click());

fileUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        fileStatus.textContent = `Selected: ${file.name} (${(file.size/1024/1024).toFixed(2)}MB)`;
    }
});

fileDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileDropZone.style.borderColor = 'var(--accent-gold)';
});

fileDropZone.addEventListener('dragleave', () => {
    fileDropZone.style.borderColor = 'var(--bronze)';
});

fileDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    fileDropZone.style.borderColor = 'var(--bronze)';
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        fileUpload.files = files;
        fileStatus.textContent = `Selected: ${files[0].name} (${(files[0].size/1024/1024).toFixed(2)}MB)`;
    }
});

document.getElementById('encryptForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const loading = document.getElementById('loading');
    const result = document.getElementById('result');
    
    loading.style.display = 'block';
    result.style.display = 'none';
    
    try {
        let pin = document.getElementById('pin').value;
        if (pin && (pin.length !== 4 || !/^\d{4}$/.test(pin))) {
            throw new Error('PIN must be exactly 4 digits');
        }
        pin = pin || null;
        const expiryTime = parseFloat(document.getElementById('expiryTime').value);
        const destructTimer = parseInt(document.getElementById('destructTimer').value) || 120;
        
        const textContent = document.getElementById('secretText').value;
        const fileInput = document.getElementById('fileUpload');
        
        let content, contentType;
        
        if (fileInput.files[0]) {
            const file = fileInput.files[0];
            if (file.size > 10 * 1024 * 1024) {
                throw new Error('File size must be less than 10MB');
            }
            content = await fileToBase64(file);
            contentType = file.type.startsWith('image/') ? 'image' : 'video';
        } else if (textContent.trim()) {
            content = textContent;
            contentType = 'text';
        } else {
            throw new Error('Please enter a secret message or upload a file');
        }
        
        const key = generateKey();
        const iv = generateIV();
        const accessToken = generateAccessToken();
        
        const encryptedContent = encryptContent(content, key, iv);
        const keyMaterial = encryptKeyMaterial(key, iv, accessToken);
        
        const response = await fetch('/api/encrypt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                encryptedContent,
                encryptedKeyBlob: keyMaterial.encryptedKeyBlob,
                blobIv: keyMaterial.blobIv,
                contentType,
                pin: pin,
                expiryHours: expiryTime,
                destructTimer: destructTimer
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to create vault');
        }
        
        const vaultLink = `${window.location.origin}/vault/${data.vaultId}#${accessToken}`;
        
        result.innerHTML = `
            <div class="result-card">
                <h3>🏴‍☠️ Vault Created Successfully!</h3>
                <p>Your secret is now secured. Share this link:</p>
                <div class="vault-link">${vaultLink}</div>
                <button onclick="copyToClipboard('${vaultLink}')" class="btn">📋 Copy Link</button>
                <div style="margin-top: 1rem; color: var(--text-secondary); font-size: 0.9rem;">
                    ⚠️ This link will self-destruct after first access or expiry
                </div>
            </div>
        `;
        result.style.display = 'block';
        showNotification('🏴‍☠️ Vault created successfully!', 'success');
        
    } catch (error) {
        result.innerHTML = `<div class="error">❌ ${error.message}</div>`;
        result.style.display = 'block';
    } finally {
        loading.style.display = 'none';
    }
});

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

function copyToClipboard(text) {
    // Try modern clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
            showNotification('📋 Vault link copied to clipboard!', 'success');
        }).catch(() => {
            fallbackCopyTextToClipboard(text);
        });
    } else {
        fallbackCopyTextToClipboard(text);
    }
}

function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showNotification('📋 Vault link copied to clipboard!', 'success');
    } catch (err) {
        showNotification('Failed to copy link', 'error');
    } finally {
        document.body.removeChild(textArea);
    }
}