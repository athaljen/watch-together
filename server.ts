import express from "express";
import http from "http";
import { Server, Socket } from "socket.io";
import cors from "cors";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

app.use(cors({ origin: "*" }));

// Room type
type Room = {
  ownerSocketId: string;
  password: string;
  roomName: string;
  videoUrl: string;
};

type CreateRoomData = {
  roomId: string;
  roomName: string;
  password: string;
  videoUrl: string;
};

// In-memory storage
const rooms: Record<string, Room> = {};

io.on("connection", (socket: Socket) => {
  console.log("User connected:", socket.id);

  // Create room
  socket.on(
    "create-room",
    ({ roomId, roomName, password, videoUrl }: CreateRoomData) => {
      rooms[roomId] = {
        ownerSocketId: socket.id,
        password,
        roomName,
        videoUrl,
      };
      console.log(`Room created: ${roomId}`);
    },
  );

  // Join room
  socket.on(
    "join-room",
    ({ roomId, password }: { roomId: string; password?: string }) => {
      const roomExist = rooms[roomId];

      if (!roomExist) {
        socket.emit("error-message", "Room not found");
        return;
      }
      if (roomExist.password) {
        if (password !== roomExist.password) {
          socket.emit("error-message", "Incorrect password");
          return;
        }
      }

      // Join the Socket.IO room
      socket.join(roomId);
      socket.emit("room-data", {
        roomId: roomId,
        roomName: roomExist.roomName,
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

// extract url's video url from provided webpage
async function extractVideoUrl(webpageUrl: string): Promise<string[] | null> {
  try {
    const res = await fetch(webpageUrl);
    const html = await res.text();

    // Use regex to find video URLs in the HTML
  const regex = /<(video|source)[^>]+src="([^">]+)"/gi;
const matches = [...html.matchAll(regex)];

return matches.length ? matches.map(m => m[2]) : null;
  } catch (error) {
    console.error("Error fetching webpage:", error);
    return null;
  }
}

app.get("/extract-video-url", async (req, res) => {
  const webpageUrl = req.query.url as string;
  if (!webpageUrl) {
    res.status(400).json({ error: "Missing url parameter" });
    return;
  }

  const videoUrls = await extractVideoUrl(webpageUrl);
  if (videoUrls) {
    res.json({ videoUrls });
  } else {
    res.status(404).json({ error: "No video URL found" });
  }
});

server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
