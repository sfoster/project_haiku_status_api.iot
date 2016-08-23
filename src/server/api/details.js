var user = require('../models/user');

module.exports.getDetails = function (req, res) {
  var query = { _id: req.params.id };
  var projection = { _id: 1, details: 1};

  user.findOne(query, projection, function(err, result){
    if (err) {
      res.status(500).json({
        error: 'error fetching details'
      });

      return;
    }

    res.json(result)
  });
};
