import express from "express";
import http from "http";
import { Server, Socket } from "socket.io";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

// Room type
type Room = {
  ownerSocketId: string;
  secret: string;
  roomName: string;
};

// In-memory storage
const rooms: Record<string, Room> = {};

io.on("connection", (socket: Socket) => {
  console.log("User connected:", socket.id);

  // Create room
  socket.on(
    "create-room",
    ({
      roomId,
      roomName,
      secret,
    }: {
      roomId: string;
      roomName: string;
      secret: string;
    }) => {
      rooms[roomId] = {
        ownerSocketId: socket.id,
        secret,
        roomName,
      };

      console.log(`Room created: ${roomId}`);
    },
  );

  // Join room
  socket.on("join-room", ({ roomId }: { roomId: string }) => {
    const room = rooms[roomId];

    if (!room) {
      socket.emit("error-message", "Room not found");
      return;
    }

    // Option 1: Directly send secret
    socket.emit("room-data", {
      roomId,
      roomName: room.roomName,
      secret: room.secret,
    });
  });

  // Optional: owner sends secret manually
  socket.on(
    "send-secret",
    ({
      roomId,
      targetSocketId,
      secret,
    }: {
      roomId: string;
      targetSocketId: string;
      secret: string;
    }) => {
      io.to(targetSocketId).emit("room-secret", {
        roomId,
        secret,
      });
    },
  );

  // Cleanup when owner disconnects
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    for (const roomId in rooms) {
      if (rooms[roomId].ownerSocketId === socket.id) {
        delete rooms[roomId];
        console.log(`Room deleted: ${roomId}`);
      }
    }
  });
});

app.get("/", (_, res) => {
  res.send("Socket server running");
});

server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
