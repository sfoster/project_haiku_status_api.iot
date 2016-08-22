var user = require('../models/user');

module.exports.getStatus = function (req, res) {
  var query = { _id: req.params.id };
  var projection = { _id: 0, status: 1};
  
  user.findOne(query, projection, function (err, result) {
    if (err) {
      res.status(500).json({
        error: 'error fetching status'
      });

      return;
    }

    res.json(result.status)
  });
};

module.exports.updateStatus = function (req, res) {
  var id = req.params.id;
  var update = {
    $set: {
      status: {
        value: req.body.value,
        'last-modified': new Date()
      }
    }
  };
  var options = { new: true };

  user.findByIdAndUpdate(id, update, options, function (err, result) {
    if (err) {
      res.status(500).json({
        error: 'error updating status'
      });

      return;
    }

    res.json(result.status);
  });
};
