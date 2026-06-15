# Secure P2P File Sharing

A secure peer-to-peer file sharing application built using WebRTC, React, Socket.IO, and Node.js.

## Features

- Peer-to-peer file transfer using WebRTC DataChannels
- End-to-end encrypted file transmission (AES-GCM)
- SHA-256 file integrity verification
- Multi-file transfer support
- Drag and drop file upload
- Transfer progress tracking
- Transfer speed monitoring
- Room-based connection system
- Invite link generation

## Tech Stack

### Frontend
- React
- Vite
- WebRTC
- Socket.IO Client

### Backend
- Node.js
- Express
- Socket.IO

## Project Structure

```
client/
 ├── src/
 ├── public/
 └── package.json

server/
 ├── server.js
 └── package.json
```

## Installation

### Clone Repository

```bash
git clone <repository-url>
```

### Frontend

```bash
cd client
npm install
npm run dev
```

### Backend

```bash
cd server
npm install
node server.js
```

## Usage

1. Start backend server.
2. Start frontend application.
3. Create or join a room.
4. Share the generated room link.
5. Select files or drag and drop them.
6. Transfer files securely.

## Security Features

- AES-GCM Encryption
- SHA-256 Integrity Verification
- Direct Peer-to-Peer Communication
- No File Storage on Server

## Demo

Demo Video:
(Add YouTube or Drive link here)

## Author

Geetham