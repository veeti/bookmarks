var async = require('async');
var url = require('url');
var model = require('../models/');

/** Link viewing. **/

exports.links = function(req, res, next) {
  // Get the wanted links
  function getLinks(callback) {
    if (req.params.tag) {
      model.getLinksWithTag(req.db, req.user, req.params.tag, callback);
    } else if (req.params.domain) {
      model.getLinksWithDomain(req.db, req.user, req.params.domain, callback);
    } else {
      model.getLinks(req.db, req.user, callback);
    }
  }

  // Get the user's tags
  function getUserTags(callback) {
    model.getUserTags(req.db, req.user, callback);
  }

  async.parallel([getLinks, getUserTags], function(err, results) {
    if (err) { return next(err); }

    var links = results[0], userTags = results[1];
    return res.render('links/index.html', { rows: links.rows, userTags: userTags.rows, currentTag: req.params.tag });
  });
};


/** Link deletion. **/

exports.deleteLink = function(req, res, next) {
  if (req.method == 'POST') {
    var ret = req.query.returnTo || req.body.returnTo || '/links';
    var id = req.params.linkId || -1;
    model.deleteLink(req.db, id, function(err, result) {
      if (err) { return next(err); }
      if (req.xhr) {
        return res.json({status: true});
      } else {
        return res.redirect(ret);
      }
    });
  } else {
    return res.render('links/delete.html');
  }
}


/** Bookmarklet pages. **/

exports.bookmarklet = function(req, res, next) {
  var url = req.query.url || '';

  model.userHasLink(req.db, req.user, url, function(err, duplicate) {
    if (err) { return next(err); }

    if (duplicate) {
      return res.render('links/bookmarklet_duplicate.html');
    } else {
      var fields = null;
      if (req.method == 'GET') {
        fields = req.query;
      }

      handleLinkForm(req, fields, function(err, result) {
        if (err) { return next(err); }

        if (result.status) {
          return res.render('links/bookmarklet_saved.html');
        } else {
          return res.render('links/bookmarklet.html', { fields: result.fields, errors: result.errors });
        }
      });
    }
  });
}

exports.bookmarkletInfo = function(req, res, next) {
  return res.render('links/bookmarklet_info.html');
}


/** Add and edit pages. **/

exports.newLink = function(req, res, next) {
  handleLinkForm(req, null, function(err, result) {
    if (err) { return next(err); }

    if (result.status) {
      // Link created
      return res.redirect('/links');
    } else {
      // Render the form
      return res.render('links/new.html', { fields: result.fields, errors: result.errors });
    }
  });
}


exports.editLink = function(req, res, next) {
  model.getLinkWithTags(req.db, req.params.linkId, function(err, row) {
    if (err) { return next(err); }

    var fields = req.body;
    if (req.method == 'GET') {
      fields.url = row.url;
      fields.title = row.title;
      fields.tags = row.tags.join(',');
      fields.note = row.note;
    }

    handleLinkForm(req, fields, function(err, result) {
      if (err) { return next(err); }

      if (result.status) {
        // Link saved
        return res.redirect('/links');
      } else {
        return res.render('links/edit.html', { fields: result.fields, errors: result.errors });
      }
    });
  });
}


/** Creation and edit functions. **/

/**
 * Validates a link and returns sanitized fields.
 */
function validateLink(fields) {
  var errors = {};

  // Title filled and within bounds
  fields.title = (fields.title || '').trim();
  if (fields.title.length < 1) {
    errors.title = 'A title is required.';
  } else if (fields.title.length > 256) {
    errors.title = 'The title can not be longer than 256 characters.';
  }

  // URL filled and valid
  fields.url = (fields.url || '').trim();
  var parsedUrl = url.parse(fields.url);
  if (parsedUrl.protocol != 'https:' && parsedUrl.protocol != 'http:') {
    errors.url = 'Invalid URL.';
  }

  // Tags within bounds and sanitized
  fields.tags = (fields.tags || '');
  var tags = (fields.tags == '' ? [] : fields.tags.split(','));
  tags.forEach(function(tag) {
    tags[tags.indexOf(tag)] = tag.trim();

    if (tag.length > 32) {
      errors.tags = 'The maximum length for a tag is 32 characters.';
    } else if (tag.length < 1) {
      errors.tags = 'The minimum length for a tag is a character.';
    }
  });

  var success = Object.keys(errors).length == 0;
  if (success) {
    fields.tags = tags;
  }

  return { errors: errors, fields: fields, success: success };
}

/**
 * Saves a link from the specified fields.
 */
function saveLink(req, id, fields, callback) {
  var tagIds = [];
  var linkId = id;

  function findTags(callback) {
    model.getTags(req.db, fields.tags, callback);
  }

  function saveLink(_tagIds, callback) {
    tagIds = _tagIds;
    if (!linkId) {
      model.createNewLink(req.db, req.user, fields.title, fields.url, fields.note, callback);
    } else {
      model.updateLink(req.db, linkId, fields.title, fields.url, fields.note, callback);
    }
  }

  function tagLink(_linkId, callback) {
    linkId = _linkId;
    var tags = [];
    for (key in tagIds) {
      tags.push(tagIds[key]);
    }
    model.tagLink(req.db, linkId, tags, callback);
  }

  async.waterfall([findTags, saveLink, tagLink], function(err, result) {
    if (err) { return callback(err); }
    callback(null, { status: true, id: linkId });
  });
}

/*
 * Shows and handles a form for link creation and editing.
 */
function handleLinkForm(req, fields, callback) {
  var fields = fields || req.body;
  var errors = {};

  if (req.method == 'POST') {
    var validation = validateLink(req.body);
    errors = validation.errors;

    if (validation.success) {
      return saveLink(req, req.params.linkId, validation.fields, callback);
    }
  }

  return callback(null, { status: false, fields: fields, errors: errors });
}
