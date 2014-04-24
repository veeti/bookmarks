var async = require('async');
var squel = require('squel').useFlavour('postgres');
squel.cls.DefaultQueryBuilderOptions.tableAliasQuoteCharacter = '"';
squel.cls.DefaultQueryBuilderOptions.nameQuoteCharacter = '"';
var bcrypt = require('bcryptjs');
var util = require('util');

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
  var query = squel.select().from('users').where('lower(username) = lower(?)', username).toParam();
  client.query(query.text, query.values, function(err, result) {
    if (err) { return callback(err); }
    callback(null, result.rows.length == 0);
  });
};

/**
 * Authenticates a specific username against a password.
 */
exports.authenticateUser = function(client, username, password, callback) {
  var query = squel.select().field('id').field('password_hash').from('users').where('lower(username) = lower(?)', username).toParam();
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
  var query = 'SELECT links.*, ARRAY_AGG(t.tag) AS tags FROM links LEFT JOIN taggings AS tt ON tt.link_id=links.id LEFT JOIN tags AS t ON t.id=tt.tag_id WHERE links.user_id = $1 GROUP BY links.id ORDER BY links.added DESC';

  client.query(query, [user], function(err, result) {
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

exports.userHasLink = function(client, user, url, callback) {
  var query = squel.select().from('links').field('id').where('url = ?', url).toParam();
  client.query(query.text, query.values, function(err, result) {
    if (err) { return callback(err); }
    callback(null, result.rows.length > 0);
  });
};

exports.updateLink = function(client, id, title, url, note, callback) {
  var query = 'UPDATE links SET title=$1, url=$2, note=$3 WHERE id=$4';
  var params = [title, url, note, id];
  client.query(query, params, function(err, result) {
    if (err) { return callback(err); }
    callback(null, id);
  });
};

exports.getLinkWithTags = function(client, id, callback) {
  var query = 'SELECT links.*, ARRAY_AGG(t.tag) AS tags FROM links LEFT JOIN taggings AS tt ON tt.link_id = links.id INNER JOIN tags AS t ON t.id=tt.tag_id WHERE links.id=$1 GROUP BY links.id';
  client.query(query, [id], function(err, result) {
    if (err) { return callback(err); }
    console.log(result.rows);
    callback(null, result.rows[0]);
  });
};

exports.getTags = function(client, tags, callback) {
  var result = {};

  async.waterfall([
    // Find tags that already exist
    function(cb) {
      client.query('SELECT id, tag FROM tags WHERE tag=ANY($1)', [tags], cb);
    },

    // Save existing tags and figure out what to insert
    function(query, cb) {
      var create = tags;

      // Existing tags
      query.rows.forEach(function(row) {
        console.log("found " + row.tag);
        result[row.tag] = row.id;
        create.splice(create.indexOf(row.tag), 1);
      });

      // New tags
      if (create.length > 0) {
        var values = [], params = [], i = 1;
        create.forEach(function(tag) {
          console.log("creating " + tag);
          values.push(util.format('($%d)', i));
          params.push(tag);
          i++;
        });
        
        client.query('INSERT INTO tags (tag) VALUES ' + values.join(', ') + ' RETURNING tag, id', params, cb);
      } else {
        cb(null, null);
      }
    },

    // Save created tags
    function(query, cb) {
      if (query != null) {
        query.rows.forEach(function(row) {
          result[row.tag] = row.id;
        });
      }

      cb(null, result);
    }
  ], callback);
};

exports.tagLink = function(client, link, tags, callback) {
  async.waterfall([
    // Delete outdated tags
    function(cb) {
      client.query('DELETE FROM taggings WHERE link_id = $1 AND tag_id != ANY($2)', [link, tags], cb);
    },

    // Find tags that already exist
    function(query, cb) {
      client.query('SELECT tag_id FROM taggings WHERE link_id = $1 AND tag_id = ANY($2)', [link, tags], cb);
    },

    // Filter results and find taggings to insert
    function(query, cb) {
      // Find the tags that aren't tagged yet
      var insert = tags;
      query.rows.forEach(function(row) {
        insert.slice(insert.indexOf(row.tag_id), 1);
      });

      // Build the query
      if (insert.length > 0) {
        var values = [], params = [], i = 1;
        insert.forEach(function(id) {
          var linkParam = i;
          var tagParam = i + 1;
          values.push(util.format('($%d, $%d)', linkParam, tagParam));

          params.push(link);
          params.push(id);

          i += 2;
        });

        client.query('INSERT INTO taggings (link_id, tag_id) VALUES ' + values.join(', '), params, cb);
      } else {
        cb();
      }
    }
  ], callback);
};
