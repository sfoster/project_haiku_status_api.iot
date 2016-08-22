var user = require('../models/user');

module.exports.getSlots = function (req, res) {
  var query = { _id: req.params.id };
  var projection = { _id: 0, slots: 1};
  
  user.findOne(query, projection, function (err, result) {
    if (err) {
      res.status(500).json({
        error: 'error fetching slots'
      });

      return;
    }

    res.json(result.slots)
  });
};
