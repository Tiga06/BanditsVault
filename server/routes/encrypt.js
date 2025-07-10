const express = require('express');
const fs = require('fs');
const path = require('path');
const { generateAccessToken } = require('../utils/neatbandit');

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

router.post('/', (req, res) => {
  const { encryptedContent, encryptedKeyBlob, blobIv, contentType, pin, expiryHours, destructTimer } = req.body;
  
  const vaultId = generateAccessToken(8);
  const accessToken = generateAccessToken(12);
  const expiryTime = Date.now() + (expiryHours * 60 * 60 * 1000);
  
  const db = loadDB();
  db.vaults[vaultId] = {
    encryptedContent,
    encryptedKeyBlob,
    blobIv,
    contentType,
    pin: pin || null,
    expiryTime,
    destructTimer: destructTimer || 120,
    accessed: false,
    createdAt: Date.now()
  };
  saveDB(db);
  
  res.json({ 
    vaultId, 
    accessToken,
    link: `${req.protocol}://${req.get('host')}/vault/${vaultId}#${accessToken}`
  });
});

module.exports = router;