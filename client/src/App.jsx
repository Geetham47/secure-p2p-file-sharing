import { io } from "socket.io-client";
import { useEffect, useRef, useState } from "react";

const socket = io(
  "https://https://secure-p2p-file-sharing.vercel.app/"
);

function App() {
  const [roomId, setRoomId] = useState("");
  const [users, setUsers] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [sendProgress, setSendProgress] = useState(0);
  const [receiveProgress, setReceiveProgress] = useState(0);
  const [senderHash, setSenderHash] = useState("");
  const [receiverHash, setReceiverHash] = useState("");
  const [connectionStatus, setConnectionStatus] =
  useState("Disconnected");
  const [sendSpeed, setSendSpeed] = useState(0);
  const [receiveSpeed, setReceiveSpeed] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [inviteLink, setInviteLink] =useState("");
  const [encryptionKey, setEncryptionKey] =useState("");

  const peerRef = useRef(null);
  const roomRef = useRef("");
  const dataChannelRef = useRef(null);
  const receivedChunksRef = useRef([]);
  const receivedSizeRef = useRef(0);
  const fileInfoRef = useRef(null);
  const encryptionKeyRef = useRef("");
  const transferStateRef = useRef({
  file: null,
  buffer: null,
  currentChunk: 0,
  totalChunks: 0,
});
  const resumeRequestedRef = useRef(false);

  useEffect(() => {
    const params =
  new URLSearchParams(
    window.location.search
  );

const room =
  params.get("room");

if (room) {
  setRoomId(room);

  roomRef.current = room;

  const key =
    room + "-mars-project";

  setEncryptionKey(key);
  encryptionKeyRef.current = key;

  socket.emit("join-room", room);
}
    socket.on("room-users", (count) => {
  console.log("ROOM USERS EVENT:", count);

  setUsers(count);

  if (count < 2) {
    setConnectionStatus("disconnected");
  }
});

    socket.on("ready", async () => {
      if (peerRef.current) {
  return;
}
      console.log("Ready");

      const peer = new RTCPeerConnection();

      peerRef.current = peer;

      peer.onconnectionstatechange = () => {
  console.log(
    "Connection State:",
    peer.connectionState
  );

  setConnectionStatus(
    peer.connectionState
  );
};

      peer.oniceconnectionstatechange = () => {
        console.log(
          "ICE State:",
          peer.iceConnectionState
        );
      };

      peer.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice-candidate", {
            roomId: roomRef.current,
            candidate: event.candidate,
          });
        }
      };

      const dataChannel =
        peer.createDataChannel("chat");
dataChannel.bufferedAmountLowThreshold =
  1024 * 1024;
      dataChannelRef.current = dataChannel;

      dataChannel.onopen = () => {
  console.log("Data channel open");

  setConnectionStatus("connected");
};

dataChannel.onclose = () => {
  console.log("Data channel closed");

  setConnectionStatus("disconnected");
};

     dataChannel.onmessage = async (event) => {
  if (typeof event.data === "string") {
    const message = JSON.parse(event.data);
if (
  message.type === "resume"
) {
  console.log(
    "Resume requested from chunk:",
    message.chunkIndex
  );

  transferStateRef.current.currentChunk =
    message.chunkIndex;

  resumeRequestedRef.current = true;

  sendFile();

  return;
}
    if (message.type === "metadata") {
  console.log(
    "Receiving file:",
    message.fileName
  );

  fileInfoRef.current = message;
  fileInfoRef.current.startTime =
  Date.now();
  receivedChunksRef.current = [];
  receivedSizeRef.current = 0;
  
  setReceiveProgress(0);
}

    if (message.type === "complete") {
      console.log(
        "File transfer complete"
      );
      setReceiveProgress(100);
      const encryptedBlob =
  new Blob(
    receivedChunksRef.current
  );

const encryptedBuffer =
  await encryptedBlob.arrayBuffer();

const decryptedBuffer =
  await decryptBuffer(
    encryptedBuffer,
    fileInfoRef.current.iv
  );

const blob =
  new Blob(
    [decryptedBuffer]
  );
     

const receivedBuffer =
  await blob.arrayBuffer();

const receivedHash =
  await generateSHA256(
    receivedBuffer
  );

setReceiverHash(receivedHash);

const endTime = Date.now();

const seconds =
  Math.max(
    (endTime -
      fileInfoRef.current.startTime) /
      1000,
    0.001
  );

const speed =
  fileInfoRef.current.fileSize /
  1024 /
  1024 /
  seconds;

setReceiveSpeed(
  speed.toFixed(2)
);
console.log(
  "Receiver SHA256:",
  receivedHash
);

      const url = URL.createObjectURL(blob);

      const a =
        document.createElement("a");

      a.href = url;

      a.download =
        fileInfoRef.current.fileName;

      a.click();

      return;
    }

    return;
  }

  receivedChunksRef.current.push(
    event.data
  );

  receivedSizeRef.current +=
    event.data.byteLength;
  if (fileInfoRef.current) {
  const progress = Math.min(
    100,
    Math.round(
      (receivedSizeRef.current /
        fileInfoRef.current.fileSize) *
        100
    )
  );

  setReceiveProgress(progress);
}
  console.log(
    "Received:",
    receivedSizeRef.current
  );
};

      const offer = await peer.createOffer();

      await peer.setLocalDescription(offer);

      socket.emit("offer", {
        roomId: roomRef.current,
        offer,
      });

      console.log("Offer sent");
    });

    socket.on("offer", async (offer) => {
      if (peerRef.current) {
  return;
}
      console.log("Offer received");

      const peer = new RTCPeerConnection();

      peerRef.current = peer;

      peer.onconnectionstatechange = () => {
  console.log(
    "Connection State:",
    peer.connectionState
  );

  setConnectionStatus(
    peer.connectionState
  );
};

      peer.oniceconnectionstatechange = () => {
        console.log(
          "ICE State:",
          peer.iceConnectionState
        );
      };

      peer.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice-candidate", {
            roomId: roomRef.current,
            candidate: event.candidate,
          });
        }
      };

      peer.ondatachannel = (event) => {
        const channel = event.channel;

        dataChannelRef.current = channel;

        channel.onopen = () => {
  console.log("Data channel open");

  setConnectionStatus("connected");
};

channel.onclose = () => {
  console.log("Data channel closed");

  setConnectionStatus("disconnected");
};

        channel.onmessage = async (event) => {
  if (typeof event.data === "string") {
    const message = JSON.parse(event.data);
if (
  message.type === "resume"
) {
  console.log(
    "Resume requested from chunk:",
    message.chunkIndex
  );

  transferStateRef.current.currentChunk =
    message.chunkIndex;

  resumeRequestedRef.current = true;

  sendFile();

  return;
}
   if (message.type === "metadata") {
  console.log(
    "Receiving file:",
    message.fileName
  );

  fileInfoRef.current = message;
  fileInfoRef.current.startTime =
  Date.now();
  receivedChunksRef.current = [];
  receivedSizeRef.current = 0;

  setReceiveProgress(0);
}

    if (message.type === "complete") {
      console.log(
        "File transfer complete"
      );
      setReceiveProgress(100);
      const encryptedBlob =
  new Blob(
    receivedChunksRef.current
  );

const encryptedBuffer =
  await encryptedBlob.arrayBuffer();

const decryptedBuffer =
  await decryptBuffer(
    encryptedBuffer,
    fileInfoRef.current.iv
  );

const blob =
  new Blob(
    [decryptedBuffer]
  );


const receivedBuffer =
  await blob.arrayBuffer();

const receivedHash =
  await generateSHA256(
    receivedBuffer
  );

setReceiverHash(receivedHash);
const endTime = Date.now();

const seconds =
  Math.max(
    (endTime -
      fileInfoRef.current.startTime) /
      1000,
    0.001
  );

const speed =
  fileInfoRef.current.fileSize /
  1024 /
  1024 /
  seconds;

setReceiveSpeed(
  speed.toFixed(2)
);
console.log(
  "Receiver SHA256:",
  receivedHash
);
      const url = URL.createObjectURL(blob);

      const a =
        document.createElement("a");

      a.href = url;

      a.download =
        fileInfoRef.current.fileName;

      a.click();

      return;
    }

    return;
  }

  receivedChunksRef.current.push(
    event.data
  );

  receivedSizeRef.current +=
    event.data.byteLength;
  if (fileInfoRef.current) {
  const progress = Math.min(
    100,
    Math.round(
      (receivedSizeRef.current /
        fileInfoRef.current.fileSize) *
        100
    )
  );

  setReceiveProgress(progress);
}
  console.log(
    "Received:",
    receivedSizeRef.current
  );
};
      };

      await peer.setRemoteDescription(
        new RTCSessionDescription(offer)
      );

      const answer = await peer.createAnswer();

      await peer.setLocalDescription(answer);

      socket.emit("answer", {
        roomId: roomRef.current,
        answer,
      });

      console.log("Answer sent");
    });

    socket.on("answer", async (answer) => {
  console.log("Answer received");

  if (
    !peerRef.current ||
    peerRef.current.signalingState !==
      "have-local-offer"
  ) {
    return;
  }

  try {
    await peerRef.current.setRemoteDescription(
      new RTCSessionDescription(answer)
    );

    console.log(
      "Peer connection negotiated"
    );
  } catch (err) {
    console.error(err);
  }
});

    socket.on(
      "ice-candidate",
      async (candidate) => {
        try {
          if (peerRef.current) {
            await peerRef.current.addIceCandidate(
              new RTCIceCandidate(candidate)
            );

            console.log(
              "ICE candidate added"
            );
          }
        } catch (err) {
          console.error(err);
        }
      }
    );

    return () => {
      socket.off("room-users");
      socket.off("ready");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
    };
  }, []);

  const joinRoom = () => {
  roomRef.current = roomId;

  const link =
    `${window.location.origin}?room=${roomId}`;

  setInviteLink(link);

  const key =
    roomId + "-mars-project";

  setEncryptionKey(key);
  encryptionKeyRef.current = key;

  socket.emit("join-room", roomId);
};
  const generateSHA256 = async (buffer) => {
  const hashBuffer =
    await crypto.subtle.digest(
      "SHA-256",
      buffer
    );

  const hashArray = Array.from(
    new Uint8Array(hashBuffer)
  );

  return hashArray
    .map((b) =>
      b.toString(16).padStart(2, "0")
    )
    .join("");
};

const importAESKey = async () => {
  const encoder =
    new TextEncoder();

  const keyData =
    encoder.encode(
      encryptionKeyRef.current
        .padEnd(32, "0")
        .slice(0, 32)
    );

  return crypto.subtle.importKey(
    "raw",
    keyData,
    {
      name: "AES-GCM",
    },
    false,
    ["encrypt", "decrypt"]
  );
};
const encryptBuffer = async (
  buffer
) => {
  const key =
  await importAESKey();

  const iv =
    crypto.getRandomValues(
      new Uint8Array(12)
    );

  const encrypted =
    await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
      },
      key,
      buffer
    );

  return {
    encrypted,
    iv,
  };
};
const decryptBuffer = async (
  encryptedBuffer,
  iv
) => {
  const key =
  await importAESKey();

  return crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array(iv),
    },
    key,
    encryptedBuffer
  );
};
  const CHUNK_SIZE = 64 * 1024;
  const waitForBufferLow = () => {
  return new Promise((resolve) => {
    if (
      dataChannelRef.current
        .bufferedAmount <
      4 * 1024 * 1024
    ) {
      resolve();
      return;
    }

    dataChannelRef.current.onbufferedamountlow =
      () => {
        resolve();
      };
  });
};
const sendFile = async () => {
  if (selectedFiles.length === 0) {
    alert("Select a file first");
    return;
  }

  if (
    !dataChannelRef.current ||
    dataChannelRef.current.readyState !== "open"
  ) {
    alert("Data channel not open");
    return;
  }

  setSendProgress(0);

  for (const file of selectedFiles) {
   const originalBuffer =
  await file.arrayBuffer();

const {
  encrypted,
  iv,
} =
  await encryptBuffer(
    originalBuffer
  );

const buffer =
  encrypted;

    const startTime =
      Date.now();

    const hash =
  await generateSHA256(
    originalBuffer
  );

    setSenderHash(hash);

    const totalChunks =
      Math.ceil(
        buffer.byteLength /
        CHUNK_SIZE
      );

    dataChannelRef.current.send(
  JSON.stringify({
    type: "metadata",
    fileName: file.name,
    fileSize:
      buffer.byteLength,
    totalChunks,
    iv: Array.from(iv),
  })
);
transferStateRef.current = {
  file,
  buffer,
  currentChunk: 0,
  totalChunks,
};
    let offset =
  transferStateRef.current.currentChunk *
  CHUNK_SIZE;

    while (
  offset <
  buffer.byteLength
) {
  const chunk =
    buffer.slice(
      offset,
      offset + CHUNK_SIZE
    );

  await waitForBufferLow();

  dataChannelRef.current.send(
    chunk
  );

  offset += CHUNK_SIZE;
  transferStateRef.current.currentChunk =
  Math.floor(
    offset / CHUNK_SIZE
  );
  const progress =
    Math.round(
      (offset /
        buffer.byteLength) *
        100
    );

  setSendProgress(
    progress
  );
}

    dataChannelRef.current.send(
      JSON.stringify({
        type: "complete",
      })
    );

    const endTime =
      Date.now();

    const seconds =
      Math.max(
        (endTime -
          startTime) /
          1000,
        0.001
      );

    const speed =
      buffer.byteLength /
      1024 /
      1024 /
      seconds;

    setSendSpeed(
      speed.toFixed(2)
    );

    console.log(
      "File sent:",
      file.name
    );

    await new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          1000
        )
    );
  }
};

  return (
  <div
  style={{
    minHeight: "100vh",
    background: "#eef2f7",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: "30px",
      color: "#0f172a",
fontWeight: "700",
      fontFamily: "Inter, sans-serif",
    }}
  >
    <div
  style={{
    width: "100%",
    maxWidth: "1400px",
    background: "#ffffff",
    backdropFilter: "blur(15px)",
    borderRadius: "24px",
    padding: "30px",
    boxShadow:
      "0 8px 32px rgba(0,0,0,0.3)",
    display: "flex",
    flexDirection: "column",
    gap: "30px",
  }}
>
      <h1
  style={{
    textAlign: "center",
    fontSize: "42px",
    marginBottom: "10px",
    color: "#0f172a",
    fontWeight: "700",
  }}
>
  🚀 Secure P2P File Sharing
</h1>

<p
  style={{
    textAlign: "center",
    opacity: 0.8,
    marginBottom: "30px",
  }}
>
  End-to-End Encrypted WebRTC Transfer
</p>
<div
  style={{
    display: "grid",
    gridTemplateColumns:
      "1fr 1fr",
    gap: "30px",
    marginTop: "20px",
  }}
>
  <div
  style={{
    background: "#ffffff",
    padding: "25px",
    border: "1px solid #e5e7eb",
    borderRadius: "20px",
    boxShadow:
      "0 4px 20px rgba(0,0,0,0.08)",
  }}
>
      <div
  style={{
    display: "flex",
    gap: "20px",
    marginBottom: "25px",
  }}
>
  <div
    style={{
      padding: "12px 20px",
      borderRadius: "12px",
      background:
  connectionStatus === "connected"
    ? "#dcfce7"
    : "#fee2e2",

color:
  connectionStatus === "connected"
    ? "#166534"
    : "#b91c1c",
    }}
  >
    {connectionStatus === "connected"
      ? "🟢 Connected"
      : "🔴 Disconnected"}
  </div>

  <div
    style={{
      padding: "12px 20px",
      borderRadius: "12px",
      background: "#dbeafe",
color: "#1d4ed8",
    }}
  >
    👥 Users: {users}
  </div>
</div>
      <input
  value={roomId}
  style={{
    width: "100%",
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    marginBottom: "10px",
  }}
        onChange={(e) =>
          setRoomId(e.target.value)
        }
        placeholder="Room ID"
      />

      <button
  onClick={joinRoom}
  style={{
    width: "100%",
    padding: "12px",
    borderRadius: "10px",
    border: "none",
    background: "#2563eb",
    color: "white",
    fontWeight: "600",
    cursor: "pointer",
    marginBottom: "15px",
  }}
>
        Join Room
      </button>
{inviteLink && (
  <div style={{ marginTop: "10px" }}>
    <p>
      Invite Link:
    </p>

    <input
      value={inviteLink}
      readOnly
      style={{
        width: "400px",
      }}
    />

    <button
      onClick={() => {
        navigator.clipboard.writeText(
          inviteLink
        );

        alert(
          "Invite link copied!"
        );
      }}
      
    >
      Copy
    </button>
  </div>
)}
{encryptionKey && (
  <div>
    <h3>Encryption Key</h3>

    <input
      value={encryptionKey}
      readOnly
      style={{
        width: "400px",
      }}
    />
  </div>
)}
      <div
  onDragOver={(e) => {
    e.preventDefault();
    setDragging(true);
  }}
  onDragLeave={() => {
    setDragging(false);
  }}
 onDrop={(e) => {
  e.preventDefault();

  setDragging(false);

  const files = Array.from(
    e.dataTransfer.files
  );

  console.log(
    "FILES:",
    files
  );

  if (files.length > 0) {
    setSelectedFiles(files);
  }
}}
  style={{
  width: "100%",
  height: "220px",
  border: dragging
    ? "3px solid #22c55e"
    : "2px dashed #94a3b8",
  borderRadius: "20px",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  flexDirection: "column",
  fontSize: "20px",
  background: "#f8fafc",
  transition: "all 0.3s ease",
}}
>
  <div>
  <div style={{ fontSize: "50px" }}>
    📂
  </div>

  <div>
    {selectedFiles.length > 0
      ? `${selectedFiles.length} file(s) selected`
      : "Drag & Drop Files Here"}
  </div>
</div>
</div>

<input
  type="file"
  multiple
  onChange={(e) => {
    setSelectedFiles(
      Array.from(e.target.files)
    );
  }}
/>
{selectedFiles.length > 0 && (
  <div>
    <h3>
      Selected Files
    </h3>

    {selectedFiles.map(
      (file, index) => (
        <div key={index}>
          <p>
            {file.name}
            {" - "}
            {(
              file.size /
              1024 /
              1024
            ).toFixed(2)}
            MB
          </p>
        </div>
      )
    )}
  </div>
)}

      <button
  onClick={sendFile}
  style={{
    width: "100%",
    padding: "12px",
    borderRadius: "10px",
    border: "none",
    background: "#22c55e",
    color: "white",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "10px",
  }}
>
  Send File
</button>
</div>
<div
  style={{
    background: "#ffffff",
    padding: "25px",
    border: "1px solid #e5e7eb",
    borderRadius: "20px",
    boxShadow:
      "0 4px 20px rgba(0,0,0,0.08)",
  }}
>
<h3>
  Sending Progress: {sendProgress}%
</h3>
<p>
  Speed: {sendSpeed} MB/s
</p>
<h3>
  Receiving Progress: {receiveProgress}%
</h3>
<p>
  Speed: {receiveSpeed} MB/s
</p>
<div
  style={{
  width: "100%",
  background: "#e5e7eb",
  borderRadius: "999px",
  overflow: "hidden",
  height: "12px",
}}
>
  <div
    style={{
      width: `${sendProgress}%`,
      height: "20px",
      background: "#22c55e",
borderRadius: "999px",
    }}
  />
</div>

<div
  style={{
  width: "100%",
  background: "#e5e7eb",
  borderRadius: "999px",
  overflow: "hidden",
  height: "12px",
}}
>
  
  <div
    style={{
      width: `${receiveProgress}%`,
      height: "20px",
      background: "#3b82f6",
borderRadius: "999px",
    }}
  />
</div>
<h3>Sender SHA-256</h3>

<p
  style={{
    maxWidth: "600px",
    wordBreak: "break-all",
  }}
>
  {senderHash}
</p>

<h3>Receiver SHA-256</h3>

<p
  style={{
    maxWidth: "600px",
    wordBreak: "break-all",
  }}
>
  {receiverHash}
</p>

{senderHash &&
 receiverHash && (
  <h2>
    {senderHash === receiverHash
      ? "✅ File Verified"
      : "❌ File Corrupted"}
  </h2>
)}

</div>

</div>

</div>

</div>
);
}

export default App;