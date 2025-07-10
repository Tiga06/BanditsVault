const express = require('express');
const cors = require('cors');
const path = require('path');
const encryptRoute = require('./routes/encrypt');
const vaultRoute = require('./routes/vault');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, '../client')));

app.use('/api/encrypt', encryptRoute);
app.use('/api/vault', vaultRoute);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.get('/create', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/create.html'));
});

app.get('/vault/:id', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/vault.html'));
});

app.listen(PORT, () => {
  console.log(`🏴‍☠️ BanditsVault server running on port ${PORT}`);
});