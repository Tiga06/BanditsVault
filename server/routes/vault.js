const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const dbPath = path.join(__dirname, '../db.json');

function loadDB() {
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({ vaults: {} }));
  }
  return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

function saveDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

router.get('/:vaultId', (req, res) => {
  const { vaultId } = req.params;
  const { pin } = req.query;
  
  const db = loadDB();
  const vault = db.vaults[vaultId];
  
  if (!vault || vault.accessed || Date.now() > vault.expiryTime) {
    return res.status(404).json({ error: 'Vault not found or expired' });
  }
  
  if (vault.pin && vault.pin !== pin) {
    return res.status(401).json({ error: 'Invalid PIN' });
  }
  
  vault.accessed = true;
  saveDB(db);
  
  res.json({
    encryptedContent: vault.encryptedContent,
    encryptedKeyBlob: vault.encryptedKeyBlob,
    blobIv: vault.blobIv,
    contentType: vault.contentType,
    destructTimer: vault.destructTimer || 120
  });
  
  setTimeout(() => {
    const currentDB = loadDB();
    delete currentDB.vaults[vaultId];
    saveDB(currentDB);
  }, 1000);
});

module.exports = router;