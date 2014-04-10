var model = require('../models/');

exports.login = function(req, res, next) {
  return res.render('users/login.html');
};

exports.postLogin = function(req, res, next) {
  var username = req.body.username;
  var password = req.body.password;
  model.authenticateUser(req.db, username, password, function(err, result) {
    if (err) { return next(err); }
    if (result.valid) {
      req.session.loginId = result.id;
      req.session.loggedIn = true;
      return res.redirect('/links');
    } else {
      return res.render('users/login.html', { 'errors': 'Invalid username or password.' });
    }
  });
};

// TODO: clean up callbacks
exports.register = function(req, res, next) {
  var fields = {};
  var errors = {};
  var fail = false;

  function renderForm() {
    return res.render('users/register.html', { 'fields': fields, 'errors': errors });
  };

  if (req.method === 'POST') {
    fields = req.body;

    if (fields.username == null || fields.username.length < 4 || fields.username.length > 32) {
      errors.username = "Please fill in a username that is between 4 and 32 characters.";
      fail = true;
    }

    if (fields.password == null || fields.password.length < 6) {
      errors.password = "Your password must be at least 6 characters long.";
      fail = true;
    }

    if (fields.password != fields.password_confirmation) {
      errors.password_confirmation = "The passwords don't match.";
      fail = true;
    }

    model.isUsernameAvailable(req.db, fields.username, function(err, result) {
      if (err) { return next(err); }

      if (!result) {
        errors.username = "This username is already in use.";
        fail = true;
      }

      if (!fail) {
        // Create user
        model.createNewUser(req.db, fields.username, fields.password, function(err, id) {
          if (err) { return next(err); }
          req.session.loginId = id;
          req.session.loggedIn = true;
          return res.redirect('/links');
        });
      } else {
        return renderForm();
      }
    });
  } else {
    return renderForm();
  }
};

exports.logout = function(req, res, next) {
  if (req.query.token != req.csrfToken) {
    return res.end('Invalid token.');
  }

  req.session.loggedIn = false;
  req.session.loginId = null;
  return res.redirect('/');
}
