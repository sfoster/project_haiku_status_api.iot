var fs = require('fs');
var path = require('path');
var cwd = process.cwd();
var argv = require('optimist').argv;

// create files for details, slots, status, message.
var userid;
var FRIEND_SLOT_COUNT = 6;
var DATA_DIR = path.resolve(__dirname, '../data');

if(require.main === module && ("user" in argv)) {
  userid = argv.user;
  var userDir = path.join(DATA_DIR, 'user', userid);
  fs.stat(userDir, function(err, stats) {
    if (!err && stats.isDirectory()) {
      populateDirectory(userDir)
    } else {
      fs.mkdir(userDir, function(err) {
        if (err) {
          throw err;
        }
        populateDirectory(userDir);
      })
    }
  });
}

function populateDirectory(userDir) {
  ['details', 'message', 'slots', 'status'].forEach(function(name) {
    var filename = path.join(userDir, name);
    var contents;
    if (name == 'details') {
      contents = JSON.stringify({
        "id": userid,
        "githubUser": "",
        "displayName": ""
      });
    }
    else if (name == 'message') {
      contents = JSON.stringify({
        "last-modified": new Date()
      });
    }
    else if (name == 'status') {
      contents = JSON.stringify({
        "last-modified": new Date(),
        "value": "0"
      });
    }
    else if (name == 'slots') {
      var slots = [];
      for(var i=0; i<FRIEND_SLOT_COUNT; i++) {
        slots.push(null);
      }
      contents = JSON.stringify({
        value: slots
      });
    }
    fs.writeFile(filename, contents, function(err) {
      if (err) {
        console.log('Couldnt write file: ' + filename);
      }
    });
  });
}


