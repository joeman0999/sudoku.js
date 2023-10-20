const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const cmd = require("node-cmd");

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', (req, res) => {
  res.sendFile('index.html',{ root: __dirname });
});

// Syncs the server to the github repository
app.post('/git', (req, res) => {
  // If event is "push"
  if (req.headers['x-github-event'] == "push") {
    cmd.run('chmod 777 git.sh'); /* :/ Fix no perms after updating */
    cmd.get('./git.sh', (err, data) => {  // Run our script
      if (data) console.log(data);
      if (err) console.log(err);
    });
  
    cmd.run('refresh');  // Refresh project

    console.log("> [GIT] Updated with origin/master");
  }

  return res.sendStatus(200); // Send back OK status
});


var ROOMS = {};
var playingClients = {};



// Handles the connection of a user
io.on('connection', (socket) => {

  socket.on('create-request', data => {
    var response = {};
    const roomCodeLength = 5;
    var roomCode = "";
    const list = "ABCDEFGHIJKLMNPQRSTUVWXYZ";

    do {
      roomCode = "";
      for(var i = 0; i < roomCodeLength; i++) {
        var rnd = Math.floor(Math.random() * list.length);
        roomCode += list[rnd];
      }
    } while (io.sockets.adapter.rooms[data]);

    // Then join/create the new room
    socket.join(roomCode);
    response["message"] = "Room joined";
    response["room"] = roomCode;
    response["leader"] = true;
    socket.emit("join-reply", response);
    ROOMS[roomCode] = {};
    ROOMS[roomCode]["leader"] = socket.id;
    ROOMS[roomCode]["memberCount"] = 1;
    playingClients[socket.id] = roomCode;
  });

  socket.on('join-request', data => {
    var response = {};
    const roomCodeLength = 5;
    if(!io.sockets.adapter.rooms.get(data) || data.length != roomCodeLength) {
      //if room does not exist
      response["message"] = "Room does not exist";
      socket.emit("join-reply", response);
      return;
    }

    //this is an ES6 Set of all client ids in the room
    const clients = io.sockets.adapter.rooms.get(data);

    //to get the number of clients in this room
    const numClients = clients ? clients.size : 0;

    if (numClients >= 10) {
      // reply room full
      response["message"] = "Room full";
      socket.emit("join-reply", response);
      return;
    }

    // Then joining is allowed
    socket.join(data);
    response["message"] = "Room joined";
    response["room"] = data;
    response["leader"] = false;
    response["board"] = ROOMS[data]["board"] || null;
    response["roomType"] = ROOMS[data]["roomType"] || null;
    response["mistakesCheck"] = ROOMS[data]["mistakesCheck"] || null;
    ROOMS[data]["memberCount"]++;
    playingClients[socket.id] = data;
    socket.emit("join-reply", response);

    // alert room of the joiner // |||||||||||||
    var newMessage = {};
    newMessage["message"] = "NAME";
    io.to(data).emit('join-event', newMessage);

    for (const clientId of clients ) {

        //this is the socket of each client in the room.
        const clientSocket = io.sockets.sockets.get(clientId);
        //you can do whatever you need with this
        //clientSocket.leave('Other Room')

        if (clientSocket === socket) {
          // get this person caught up on what is going on in the room
          // this is the person who sent the request
        }
    }
  });

  socket.on('disconnect', function() {

    if (playingClients && playingClients[socket.id]) {
      var room = playingClients[socket.id];
      delete playingClients[socket.id];
      socket.leave(room);
      const clients = io.sockets.adapter.rooms.get(room);
      const numClients = clients ? clients.size : 0;
      if (numClients == 0) { // room empty
        delete ROOMS[room];
        return;
      }
      ROOMS[room]["memberCount"]--;
      const clientId = [...clients][0];
      const clientSocket = io.sockets.sockets.get(clientId); // ||||||| leader change not working
      ROOMS[room]["leader"] = clientId;
      clientSocket.emit("new-leader", null);
    }

 });

  socket.on('start-request', data => {
    if (data == null || data.BOARD == null || data.BOARD.candidates == null || 
      data.BOARD.difficulty == null || data.BOARD.original_board == null || 
      data.BOARD.solution == null || data.BOARD.true_difficulty == null || 
      data.BOARD.user_vals == null || data.ROOM.roomType == null || 
      data.ROOM.mistakesCheck == null) {
      console.log("Failed start-request");
      console.log(data);
      return;
    } else if (playingClients[socket.id]) {
      var room = playingClients[socket.id];
      ROOMS[room]["board"] = data.BOARD;
      ROOMS[room]["roomType"] = data.ROOM.roomType;
      ROOMS[room]["mistakesCheck"] = data.ROOM.mistakesCheck;
      io.to(room).emit('start-event', data);
    }
  });

  socket.on('update-request', data => {
    if (data == null || data.candidates == null || data.difficulty == null || data.original_board == null || data.solution == null || data.true_difficulty == null || data.user_vals == null) {
      console.log("Failed update-request");
      console.log(data);
      return;
    } else if (playingClients[socket.id]) {
      var room = playingClients[socket.id];
      ROOMS[room]["board"] = data;
      io.to(room).emit('update-event', data);
    }
  });
  
});



// Allows the server to work locally and on a remote server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('listening on *: ' + PORT);
});