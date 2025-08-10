// server.js (Corrected and Robust)

const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// This line is the key. It tells the server that any request for a file
// (like /media/gemMine.png or /js/main.js) should be looked for in the
// same directory where this server.js file is located.
app.use(express.static(__dirname));

// This ensures that if you just navigate to http://localhost:3000,
// it will serve your index.html file.
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
