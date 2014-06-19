/*
 * Fills the domain column for links in the database before its addition.
 */

var async = require('async');
var url = require('url');

var migration = require('./migration');

migration.getDatabaseClient(function(err, client) {
  function getAllLinks(callback) {
    client.query('SELECT id, url FROM links', [], callback);
  }

  function makeQueryWith(domain, id) {
    return function(callback) {
      client.query('UPDATE links SET domain=$1 WHERE id = $2', [domain, id], callback);
    };
  }

  function makeQueries(result, callback) {
    var queries = [];

    for (var i = 0; i < result.rows.length; i++) {
      if (result.rows[i].domain) {
        continue;
      }

      var link = result.rows[i].url;
      var domain = url.parse(link).host;
      queries.push(makeQueryWith(domain, result.rows[i].id));
    }

    callback(null, queries);
  }

  function runQueries(functions, callback) {
    async.series(functions, callback);
  }

  async.waterfall([getAllLinks, makeQueries, runQueries], function(err, result) {
    client.end();
    if (err) { return console.error(err); }
    console.log('Migration complete.');
  });
});

