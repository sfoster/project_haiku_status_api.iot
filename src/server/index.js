'use strict';
var bodyParser = require('body-parser');
var cors = require('cors');
var express = require('express');
var mongoose = require('mongoose');
var path = require('path');
var api = {
  status: require('./api/status'),
  slots: require('./api/slots'),
  message: require('./api/message'),
  details: require('./api/details'),
  user: require('./models/user')
};

var app = express();
var config = {
  port: process.env.PORT || 3000
};

app.use(cors());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

mongoose.connect('mongodb://localhost/haiku');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log("Connected to Haiku database with Mongoose");
});

app.get('/user/:id/status', api.status.getStatus);
app.put('/user/:id/status', api.status.updateStatus);
app.get('/user/:id/message', api.message.getMessage);
app.put('/user/:id/message', api.message.updateMessage);
app.get('/user/:id/slots', api.slots.getSlots);
app.get('/user/:id/details', api.details.getDetails);

app.listen(config.port, function () {
  console.log('Status app listening on port ' + config.port + '!');
});
