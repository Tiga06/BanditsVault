const crypto = require('crypto');

function generateRawKeyBytes() {
  const aesKey = crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);
  return { aesKey, iv };
}

function generateAccessToken(length = 12) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return token;
}

function deriveKeyFromToken(token) {
  return crypto.createHash('sha256').update(token).digest();
}

function aesEncrypt(dataBuffer, key, iv) {
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(dataBuffer), cipher.final()]);
  return encrypted;
}

function aesDecrypt(encryptedBuffer, key, iv) {
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  const decrypted = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
  return decrypted;
}

function encryptKeyMaterial(aesKey, iv, accessToken) {
  const keyBlob = Buffer.concat([aesKey, iv]);
  const derivedKey = deriveKeyFromToken(accessToken);
  const blobIv = crypto.randomBytes(16);
  const encryptedBlob = aesEncrypt(keyBlob, derivedKey, blobIv);
  return {
    encryptedKeyBlob: encryptedBlob.toString('base64'),
    blobIv: blobIv.toString('base64')
  };
}

function decryptKeyMaterial(encryptedKeyBlobB64, blobIvB64, token) {
  const encryptedBlob = Buffer.from(encryptedKeyBlobB64, 'base64');
  const iv = Buffer.from(blobIvB64, 'base64');
  const derivedKey = deriveKeyFromToken(token);
  const decryptedBlob = aesDecrypt(encryptedBlob, derivedKey, iv);
  const aesKey = decryptedBlob.slice(0, 32);
  const aesIv = decryptedBlob.slice(32, 48);
  return { aesKey, iv: aesIv };
}

function encryptContent(contentStr, aesKey, iv) {
  return aesEncrypt(Buffer.from(contentStr, 'utf8'), aesKey, iv).toString('base64');
}

function decryptContent(encryptedStr, aesKey, iv) {
  const decryptedBuffer = aesDecrypt(Buffer.from(encryptedStr, 'base64'), aesKey, iv);
  return decryptedBuffer.toString('utf8');
}

module.exports = {
  generateRawKeyBytes,
  generateAccessToken,
  encryptKeyMaterial,
  decryptKeyMaterial,
  encryptContent,
  decryptContent
};