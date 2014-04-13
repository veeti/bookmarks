var express = require('express');
var pg = require('pg');
var path = require('path');
var nunjucks = require('nunjucks');
var app = express();

// Load app configuration
// FIXME: Validate config
var config = {};
try {
  config = require('./config');
} catch (e) {
  console.error('Could not find a configuration file at config.js. Please see the documentation and config.js.example.');
  process.exit(-1);
}

// Templating
nunjucks.configure('views', {
	autoescape: true,
	express: app
});

// Middleware
app.use(require('body-parser')());
app.use(require('cookie-session')({
  keys: config.session_secret_keys
}));
app.use(require('simple-csrf')());
app.use(express.static(path.join(__dirname, 'static')));

// Export CSRF token and other view locals
app.use(function(req, res, next) {
  var token = req.csrfToken;
  res.locals.csrfField = new nunjucks.runtime.SafeString("<input type='hidden' name='_csrf_token' value='" + token + "' />");
  res.locals.loggedIn = req.session.loggedIn || false;
  res.locals.rootPath = config.root_path;
  req.user = req.session.loginId || -1;
  next();
});

// Database
app.use(function(req, res, next) {
  req.getDatabase = function(cb) {
    pg.connect(config.database_url, cb);
  };
  next();
});

// Routes
var router = require('./router');
router.route(app);

// Export
exports.app = app;
