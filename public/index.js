<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>MooMoo Clone (prototype)</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="ui">
    <div id="topbar">MooMoo clone prototype — use WASD or arrow keys to move. Click to build wall (cost 20 wood).</div>
    <div id="minimap"></div>
    <div id="stats">HP: <span id="hp">100</span> | Wood: <span id="wood">0</span></div>
  </div>
  <canvas id="game" width="1024" height="768"></canvas>

  <script src="/socket.io/socket.io.js"></script>
  <script src="client.js"></script>
</body>
</html>
