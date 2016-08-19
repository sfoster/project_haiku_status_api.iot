var user = require('../models/user');

module.exports.getMessage = function (req, res) {
  var query = { _id: req.params.id };
  var projection = { _id: 0, message: 1};

  user.findOne(query, projection, function (err, result) {
    if (err) {
      res.status(500).json({
        error: 'error fetching message'
      });

      return;
    }

    res.json(result.message)
  })
};

module.exports.updateMessage = function (req, res) {
  var id = req.params.id;
  var update = {
    $set: {
      message: {
        value : req.body.value, 
        sender: req.body.sender, 
        'last-modified': new Date()
      }
    }
  };
  var options = { new: true };

  user.findByIdAndUpdate(id, update, options, function (err, result) {
    if (err) {
      res.status(500).json({
        error: 'error updating message'
      });

      return;
    }

    res.json(result.status);
  });
};
