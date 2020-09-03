// Webpack uses this to work with directories
const path = require('path');

// This is the main configuration object.
// Here you write different options and tell Webpack what to do
module.exports = {
  "mode": "development",
  "devtool": "source-map",
  "entry": "./lib/jslib/offlinenotebook.js",
  "output": {
      "path": __dirname + '/jupyter_offlinenotebook/static/jslib',
      "filename": "offlinenotebook.js",
      "libraryTarget": "amd"
  }
}