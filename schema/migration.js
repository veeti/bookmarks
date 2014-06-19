var pg = require('pg');
var url = process.env.DB_URL;

if (!url) {
  console.error('Set a database URL for this migration on the DB_URL environment variable. Exiting.');
  return process.exit(1);
}

exports.getDatabaseClient = function(callback) {
 var client = new pg.Client(url);
 client.connect(function(err) {
    if (err) {
      console.error('Failed to connect to ' + url + '.');
      return process.exit(2);
    }
    callback(null, client);
 });
};

