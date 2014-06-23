var getDatabase = require('./models').getDatabase;

// Import middle processing functions
var middleware = require('./controllers');
var authUser = middleware.authUser;
var authLink = middleware.authLink;

exports.route = function(app) {
  // Front page
  app.get('/', function(req, res, next) {
    res.render('index.html');
  });

  var links = require('./controllers/links');
  var users = require('./controllers/users');

  // Link browsing
  app.get('/links', authUser, getDatabase, links.links);
  app.get('/links/tag/:tag', authUser, getDatabase, links.links);
  app.get('/links/domain/:domain', authUser, getDatabase, links.links);

  // Link submission and modification
  app.get('/links/new', authUser, getDatabase, links.newLink);
  app.post('/links/new', authUser, getDatabase, links.newLink);
  app.get('/links/:linkId', authUser, getDatabase, authLink, links.editLink);
  app.post('/links/:linkId', authUser, getDatabase, authLink, links.editLink);
  app.get('/links/:linkId/delete', authUser, getDatabase, authLink, links.deleteLink);
  app.post('/links/:linkId/delete', authUser, getDatabase, authLink, links.deleteLink);

  // Bookmarklet
  app.get('/bookmarklet/add', authUser, getDatabase, links.bookmarklet);
  app.post('/bookmarklet/add', authUser, getDatabase, links.bookmarklet);
  app.get('/bookmarklet', links.bookmarkletInfo);

  // Log in & sign up
  app.get('/login', getDatabase, users.login);
  app.post('/login', getDatabase, users.postLogin);
  app.get('/register', getDatabase, users.register);
  app.post('/register', getDatabase, users.register);
  app.get('/logout', users.logout);
}
