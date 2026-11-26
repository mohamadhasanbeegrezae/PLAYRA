const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.json());
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/health", (req, res) => {
  res.json({
    status: "online",
    app: "PLAYRA"
  });
});

const rooms = new Map();

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  socket.on("join-room", (roomName) => {
    if (typeof roomName !== "string" ||
        !/^[a-zA-Z0-9_-]{1,30}$/.test(roomName)) return;

    socket.join(roomName);
    socket.data.room = roomName;

    if (!rooms.has(roomName)) {
      rooms.set(roomName, new Set());
    }

    rooms.get(roomName).add(socket.id);

    io.to(roomName).emit("players-count", {
      count: rooms.get(roomName).size
    });
  });

  socket.on("chat-message", (message) => {
    const room = socket.data.room;

    if (!room || typeof message !== "string") return;

    const cleanMessage = message.trim().slice(0, 300);

    if (!cleanMessage) return;

    io.to(room).emit("chat-message", {
      sender: "بازیکن",
      message: cleanMessage,
      time: Date.now()
    });
  });

  socket.on("disconnect", () => {
    const room = socket.data.room;

    if (room && rooms.has(room)) {
      rooms.get(room).delete(socket.id);

      io.to(room).emit("players-count", {
        count: rooms.get(room).size
      });

      if (rooms.get(room).size === 0) {
        rooms.delete(room);
      }
    }

    console.log("Player disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
  console.log("PLAYRA server running on port " + PORT);
});
