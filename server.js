const express = require('express');
const path = require('path');
const app = express();
// const path = require('path');

// Run app serving static files in dist directory
app.use(express.static(__dirname + '/dist/CryptoChat'));

/// For all GET requests, send back index.html
// so that PathLocationStrategy can be used
// app.get('/*', function(req, res) {
//   res.sendFile(path.join(__dirname + '/dist/index.html'));
// });

app.listen(process.env.PORT || 4200);