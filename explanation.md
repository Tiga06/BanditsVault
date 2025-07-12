# BanditsVault: Technical Architecture & Security Explanation

## 🏴‍☠️ Overview
BanditsVault is a secure, self-destructing vault system that allows users to encrypt and share sensitive content (text, images, videos) via one-time-use links. The system employs military-grade encryption and automatic destruction mechanisms.

## 🔐 Encryption Mechanism

### Client-Side Encryption (AES-256)
1. **Key Generation**: Random 256-bit AES key generated using `CryptoJS.lib.WordArray.random(256/8)`
2. **IV Generation**: Random 128-bit initialization vector using `CryptoJS.lib.WordArray.random(128/8)`
3. **Content Encryption**: User content encrypted with AES-256-CBC using generated key and IV
4. **Access Token**: 12-character random token generated for vault access

### Dual-Layer Key Protection
```javascript
// Layer 1: Content encryption
encryptedContent = AES.encrypt(userContent, contentKey, {iv: contentIV})

// Layer 2: Key material encryption
keyBlob = contentKey + "|" + contentIV
derivedKey = SHA256(accessToken)
encryptedKeyBlob = AES.encrypt(keyBlob, derivedKey, {iv: blobIV})
```

## 🗄️ Data Storage Architecture

### Server-Side Storage (`db.json`)
```json
{
  "vaults": {
    "vaultId": {
      "encryptedContent": "encrypted_data",
      "encryptedKeyBlob": "encrypted_key_material", 
      "blobIv": "blob_initialization_vector",
      "contentType": "text|image|video",
      "pin": "optional_4digit_pin",
      "expiryTime": "timestamp",
      "destructTimer": "seconds_before_destruction",
      "accessed": false,
      "createdAt": "timestamp"
    }
  }
}
```

### What's Stored vs What's Not
**Stored on Server:**
- Encrypted content (unreadable without access token)
- Encrypted key material (unreadable without access token)
- Metadata (content type, expiry, PIN hash)

**Never Stored on Server:**
- Original content (text/images/videos)
- Encryption keys
- Access tokens
- User data or identifiers

## 🔗 URL Structure & Access Control

### Vault Link Format
```
https://domain.com/vault/{vaultId}#{accessToken}
```

- **vaultId**: Server-side identifier (8 characters)
- **accessToken**: Client-side decryption key (12 characters, never sent to server)
- **Hash Fragment**: Access token stays in browser, never transmitted

## 🛡️ Security Features

### Multi-Layer Security
1. **Client-Side Encryption**: Content encrypted before leaving user's browser
2. **Zero-Knowledge**: Server cannot decrypt content without access token
3. **Access Token Isolation**: Token in URL hash, never sent to server
4. **PIN Protection**: Optional 4-digit PIN for additional security
5. **Time-Based Expiry**: Configurable link expiration (10min - 24hrs)
6. **Self-Destruction**: Custom timer (30-3600 seconds) after first access

### Automatic Destruction Triggers
- **Immediate**: Vault deleted from server upon first access
- **Time Expiry**: Links expire based on configured time (10min-24hrs)
- **Client Countdown**: Custom timer (30-3600 seconds) for viewing window
- **Manual**: User can destroy vault before timer expires

## 🔄 Application Flow

### Vault Creation Process
1. User enters content (text/image/video)
2. Client generates random AES key + IV
3. Content encrypted client-side with AES-256
4. Access token generated (12 chars)
5. Key material encrypted with token-derived key
6. Encrypted data sent to server (original content never transmitted)
7. Server stores encrypted data with metadata
8. Unique vault link generated and returned

### Vault Access Process
1. User clicks vault link
2. Browser extracts vaultId from URL path
3. Access token extracted from URL hash (client-side only)
4. Server fetched for encrypted data using vaultId
5. PIN verification if required
6. Client decrypts key material using access token
7. Client decrypts content using recovered keys
8. Content displayed to user
9. Countdown timer starts
10. Vault marked as accessed and scheduled for deletion

## 🏗️ Technical Stack

### Frontend
- **Encryption**: CryptoJS library (AES-256, SHA-256)
- **UI Framework**: Vanilla JavaScript + CSS
- **Styling**: Custom CSS with responsive design
- **Fonts**: Cinzel Decorative, Inter

### Backend
- **Runtime**: Node.js + Express.js
- **Storage**: JSON file-based database
- **Routes**: RESTful API endpoints
- **Security**: CORS enabled, input validation

### File Structure
```
BanditsVault/
├── client/
│   ├── index.html          # Landing page
│   ├── create.html         # Vault creation
│   ├── vault.html          # Vault access
│   ├── styles.css          # Styling
│   ├── encrypt.js          # Encryption logic
│   ├── vault.js            # Decryption logic
│   └── vault.png           # Logo
├── server/
│   ├── app.js              # Express server
│   ├── db.json             # Data storage
│   ├── routes/
│   │   ├── encrypt.js      # Vault creation API
│   │   └── vault.js        # Vault access API
│   └── utils/
│       └── neatbandit.js   # Utility functions
└── explanation.md          # This file
```

## 🔒 Security Guarantees

### What BanditsVault Protects Against
- **Server Compromise**: Encrypted data unreadable without access tokens
- **Network Interception**: Content encrypted before transmission
- **Unauthorized Access**: PIN protection + one-time use links
- **Data Persistence**: Automatic destruction prevents long-term exposure
- **Brute Force**: Short-lived links with custom expiry times

### Limitations
- **Client-Side Vulnerabilities**: Malware on user's device could intercept content
- **Social Engineering**: Users sharing links inappropriately
- **Browser Security**: Relies on browser's security for key handling
- **Physical Access**: Device access during vault viewing

## 🚀 Deployment & Usage

### Server Requirements
- Node.js runtime
- File system write permissions
- HTTPS recommended for clipboard API

### Environment Setup
```bash
npm install          # Install dependencies
npm start           # Start server on port 3000
```

### API Endpoints
- `POST /api/encrypt` - Create new vault
- `GET /api/vault/:id` - Access vault (with optional PIN)
- `GET /` - Serve landing page
- `GET /create` - Serve creation page
- `GET /vault/:id` - Serve access page

## 🎯 Use Cases
- Secure password sharing
- Confidential document transmission
- Temporary file sharing
- Sensitive message delivery
- One-time secret distribution

---

*Built by Team EP6xBandits - Where secrecy meets royal style* 🏴‍☠️