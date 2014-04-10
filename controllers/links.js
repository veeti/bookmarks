var url = require('url');
var model = require('../models/');

exports.links = function(req, res, next) {
  model.getLinks(req.db, req.user, function(err, result) {
    if (err) { return next(err); }

    for (var i = 0; i < result.rows.length; i++) {
      result.rows[i].domain = url.parse(result.rows[i].url).host;
    }

    return res.render('links/index.html', {'rows': result.rows});
  });
};

exports.createLink = function(req, res, next) {
  var fields = {};
  var errors = {};
  var fail = false;

  function renderForm() {
    return res.render('links/new.html', {'fields': fields, 'errors': errors});
  }

  if (req.method == 'POST') {
    var fields = req.body;

    if (fields.title == null || fields.title == '' || fields.title.length > 256) {
      errors.title = 'Please enter a title.';
      fail = true;
    }

    var address = fields.url || '';
    var parsed = url.parse(address);
    if (parsed.protocol != 'https:' && parsed.protocol != 'http:') {
      errors.url = 'Invalid URL.';
      fail = true;
    }

    if (!fail) {
      model.createNewLink(req.db, req.user, fields.title, fields.url, fields.note, function(err, id) {
        if (err) { return next(err); }
        return res.redirect('/links');
      });
    } else {
      return renderForm();
    }
  } else {
    return renderForm();
  }
};
