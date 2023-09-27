const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const cmd = require("node-cmd");
const PORT = process.env.PORT || 3000;

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', (req, res) => {
  res.sendFile('index.html',{ root: __dirname });
});

app.post('/git', (req, res) => {
  // If event is "push"
  if (req.headers['x-github-event'] == "push") {
    cmd.run('chmod 777 git.sh'); /* :/ Fix no perms after updating */
    cmd.get('./git.sh', (err, data) => {  // Run our script
      if (data) console.log(data);
      if (err) console.log(err);
    });
  }
  cmd.run('refresh');  // Refresh project

  console.log("> [GIT] Updated with origin/master");

  return res.sendStatus(200); // Send back OK status
});

io.on('connection', (socket) => {
  console.log('a user connected');
});

server.listen(PORT, () => {
  console.log(PORT);
  console.log('listening on *: ' + PORT);
});