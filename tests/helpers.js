const path = require("path");

function pageUrl(filename) {
  return "file://" + path.resolve(__dirname, "..", filename);
}

module.exports = { pageUrl };
