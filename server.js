// server.js (Corrected and Robust)

const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

// This is the most important part. It tells the server to serve all files
// from the same directory this server.js file is in.
app.use(express.static(__dirname));

// This is a fallback to ensure that if someone navigates to the root,
// they get the main HTML page.
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// We explicitly listen on '127.0.0.1' to avoid network protocol issues like QUIC.
app.listen(port, '127.0.0.1', () => {
  console.log(`Server is running! Open your browser and go to http://127.0.0.1:${port}`);
});
