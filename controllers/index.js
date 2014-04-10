exports.authUser = function(req, res, next) {
  if (!req.session.loggedIn) {
    return res.redirect('/login');
  }
  next();
}
