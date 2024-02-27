const express = require('express');
const server = require('http').createServer();
const app = express();

app.get('/', function (req, res) {
  res.sendFile('index.html', { root: __dirname });
});

server.on('request', app);

// Catching interrupts
process.on('SIGINT', () => {
  // Close websocket connection
  wss.clients.forEach(function (client) {
    client.close();
  })
  server.close(() => {
    shutdownDB();
  });
});

server.listen(3000, function () {
  console.log('Listening on 3000');
});



/** Begin Websockets */

// Create Server
const WebSocketServer = require('ws').Server;

// Give server a name -- refer to server created above
const wss = new WebSocketServer({ server: server });

// Websockets uses different states -- want to do actions when the websocket actually connects
// -- use listners
// -- respond with function when user connects
// -- -- takes in the websocket object to pass in the connected web socket connection

// This will run whenever a user connects to the web server
wss.on('connection', function connection(ws) {
  // What should happen when someone connects to the web server?
  // -- use data on wss for "size" -- number of clients currently connected to web server
  const numClients = wss.clients.size;
  // Log the number of clients connected
  console.log('Clients connection', numClients);

  // Whenever a connection happens, log the total visitors and current time
  // Have to call the values as the actual things we're inserting
  db.run(`INSERT INTO visitors (count, time)
    VALUES (${numClients}, datetime('now'))`);

  // Broadcast command -- sends a message to every connected client
  wss.broadcast(`Current visitors: ${numClients}`);

  // Handle different states -- open, close, error
  // When a web socket connects AND it is open, send a message to the client
  if (ws.readyState === ws.OPEN) {
    ws.send('Welcome to the server!');
  }
  
  // When the web socket closes
  ws.on('close', function close() {
    wss.broadcast(`Current visitors: ${numClients}`);
    console.log('A client has disconnected');
  });
});

// Create "Broadcast" function to use
wss.broadcast = function broadcast(data) {
  wss.clients.forEach(function each(client) {
    client.send(data);
  });
};

/** End Websockets */

/** Begin Database */

// Import the Library
const sqlite = require('sqlite3');

// Set up a new database -- put it in memory (will erase on restart)
const db = new sqlite.Database(':memory:');

// Set up a table -- every time the service starts
// -- serialize: makes sure the database is set up before write to the table
db.serialize(() => {
  // Run SQL command -- db.run
  db.run((`
    CREATE TABLE visitors (
        count INTEGER,
        time TEXT
    )
  `))
});

// Shorthand function -- not repeat queries over and over
// -- Query visitor table to get counts
function getCounts() {
  // every row, do something
  db.each("SELECT * FROM visitors", (err, row) => {
    console.log(row);
  })
}

// Always needs to close a database
// -- call this function in catching the interrupts -- use a listener in server setup
function shutdownDB() {
  // Get final counts for day
  getCounts();
  // Close the database
  console.log("Shutting down the database");
  db.close();
}

