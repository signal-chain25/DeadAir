const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("db.sqlite");
const cron = require("node-cron");

app.use(express.static("public"));
app.get("/", (req, res) => res.sendFile(__dirname + "/index.html"));
app.get("/chat.html", (req, res) => res.sendFile(__dirname + "/chat.html"));

db.run(`CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room TEXT,
  name TEXT,
  msg TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);`);

io.on("connection", (socket) => {
  socket.on("join", (room) => {
    socket.join(room);
    db.all(`SELECT name, msg FROM messages WHERE room = ? ORDER BY id DESC LIMIT 20`, [room], (err, rows) => {
      if (!err && rows) {
        rows.reverse().forEach(row => {
          socket.emit("chat message", row);
        });
      }
    });

    socket.on("chat message", (data) => {
      db.run(`INSERT INTO messages (room, name, msg) VALUES (?, ?, ?)`, [data.room, data.name, data.msg]);
      io.to(data.room).emit("chat message", { name: data.name, msg: data.msg });
    });
  });
});

cron.schedule("0 0 * * *", () => {
  db.run("DELETE FROM messages");
  console.log("💀 Wiped messages at midnight");
});

http.listen(3000, () => {
  console.log("Dead Air running on port 3000");
});
