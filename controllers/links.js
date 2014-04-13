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

/**
 * Validation and save logic for link creation.
 */
function submitLink(req, cb) {
  var fields = {};
  var errors = {};

  if (req.method == 'POST') {
    var fields = req.body;

    if (fields.title == null || fields.title.length > 256 || fields.title.length < 1) {
      errors.title = 'A title is required.';
    }

    var parsedUrl = url.parse(fields.url || '');
    if (parsedUrl.protocol != 'https:' && parsedUrl.protocol != 'http:') {
      errors.url = 'Invalid URL.';
    }

    if (Object.keys(errors).length > 0) {
      // Errors during validation
      return cb(null, { status: false, errors: errors, fields: fields });
    } else {
      // Create the link
      model.createNewLink(req.db, req.user, fields.title, fields.url, fields.note, function(err, id) {
        if (err) { return cb(err); }
        return cb(null, { status: true, id: id });
      });
    }
  } else {
    // Show blank form populated with query params, if any
    return cb(null, { status: false, fields: req.query });
  }
}

/**
 * Shared logic for link creation pages.
 */
function createLink(req, res, next, template) {
  var template = template || 'links/new.html';

  submitLink(req, function(err, result) {
    if (err) {
      return next(err);
    } else if (result.status) {
      // Saved successfully
      if (template == 'links/bookmarklet.html') {
        return res.render('links/bookmarklet_saved.html');
      } else {
        return res.redirect('/links');
      }
    } else {
      // Form has errors or GET
      return res.render(template, { fields: result.fields, errors: result.errors });
    }
  });
}

exports.bookmarklet = function(req, res, next) {
  var url = req.query.url || '';
  model.userHasLink(req.db, req.user, url, function(err, duplicate) {
    if (err) {
      return next(err);
    } else if (duplicate) {
      return res.render('links/bookmarklet_duplicate.html');
    } else {
      return createLink(req, res, next, 'links/bookmarklet.html');
    }
  });
}

exports.bookmarkletInfo = function(req, res, next) {
  return res.render('links/bookmarklet_info.html');
}

exports.createLink = function(req, res, next) {
  return createLink(req, res, next, 'links/new.html');
};
