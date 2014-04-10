var async = require('async');
var squel = require('squel');
squel.useFlavour('postgres');
var bcrypt = require('bcryptjs');

/**
 * A middleware that adds a database connection to the request.
 */
exports.getDatabase = function(req, res, next) {
  req.getDatabase(function(err, client, done) {
    if (err) { return next(err); }

    req.db = client;
    req.dbDone = done;
    res.on('finish', function() {
      req.dbDone();
    });

    next();
  });
};

/**
 * Hashes the specified password with a random salt.
 */
exports.hashPassword = function(password, callback) {
  function generateSalt(cb) {
    bcrypt.genSalt(10, cb);
  }

  function hash(salt, cb) {
    bcrypt.hash(password, salt, cb);
  }

  async.waterfall([generateSalt, hash], function(err, hash) {
    if (err) {
      callback(err);
    } else {
      callback(null, hash);
    }
  });
}

/**
 * Validates a password against a hash.
 */
exports.validatePassword = function(hash, password, callback) {
  bcrypt.compare(password, hash, function(err, res) {
    if (err) { return callback(err); }
    callback(null, res);
  });
};

/**
 * Checks if a username is available for registration.
 */
exports.isUsernameAvailable = function(client, username, callback) {
  var query = squel.select().from('users').where('username = ?', username).toParam();
  client.query(query.text, query.values, function(err, result) {
    if (err) { return callback(err); }
    callback(null, result.rows.length == 0);
  });
};

/**
 * Authenticates a specific username against a password.
 */
exports.authenticateUser = function(client, username, password, callback) {
  var query = squel.select().field('id').field('password_hash').from('users').where('username = ?', username).toParam();
  client.query(query.text, query.values, function(err, result) {
    if (err) { return callback(err); }

    if (result.rows.length > 0) {
      exports.validatePassword(result.rows[0].password_hash, password, function(err, valid) {
        if (err) { return callback(err); }
        callback(null, { 'id': result.rows[0].id, 'valid': valid });
      });
    } else {
      callback(null, { 'id': -1, 'valid': false });
    }
  });
};

/**
 * Creates a new user in the database with the specified username and password.
 */
exports.createNewUser = function(client, username, password, callback) {
  exports.hashPassword(password, function(err, hash) {
    var query = squel.insert().into('users')
      .set('username', username)
      .set('password_hash', hash)
      .returning('id')
      .toParam();

    client.query(query.text, query.values, function(err, result) {
      if (err) { return callback(err); }
      callback(null, result.rows[0].id);
    });
  });
};

/**
 * Gets links for the specified user.
 */
exports.getLinks = function(client, user, callback) {
  var query = squel.select()
    .field('id')
    .field('title')
    .field('url')
    .field('note')
    .field('added')
    .from('links')
    .where('user_id = ?', user)
    .toParam();

  client.query(query.text, query.values, function(err, result) {
    if (err) { return callback(err); }
    callback(null, result);
  });
};

/**
 * Creates a new link in the database.
 */
exports.createNewLink = function(client, user, title, url, note, callback) {
  var query = squel.insert().into('links')
    .set('user_id', user)
    .set('title', title)
    .set('url', url)
    .set('note', note)
    .set('added', new Date().toISOString())
    .returning('id')
    .toParam();

  client.query(query.text, query.values, function(err, result) {
    if (err) { return callback(err); }
    callback(null, result.rows[0].id);
  });
};
