// server.js (Corrected for Deployment)

const express = require('express');
const path = require('path');
const app = express();

// Render provides the port to use via the PORT environment variable.
// We fall back to 3000 for local development.
const port = process.env.PORT || 3000;

// This tells the server to serve all files from the project's root directory.
app.use(express.static(path.join(__dirname)));

// This is a fallback to ensure that direct navigation to your site works.
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// THE FIX IS HERE:
// We remove '127.0.0.1'. By default, Node.js will listen on '0.0.0.0',
// which is exactly what Render and other hosting services need.
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
