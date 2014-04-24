var model = require('../models');

exports.authUser = function(req, res, next) {
  if (!req.session.loggedIn) {
    return res.redirect('/login');
  }
  next();
}

exports.authLink = function(req, res, next) {
  var id = req.params.linkId || -1;
  model.userCanAccessLink(req.db, req.user, id, function(err, authorized) {
    if (authorized) {
      next();
    } else if (!authorized) {
      return res.redirect('/');
    } else if (err) {
      return next(err);
    }
  });
}
