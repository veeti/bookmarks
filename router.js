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

  // Links
  var links = require('./controllers/links');
  app.get('/links', authUser, getDatabase, links.links);
  app.get('/links/tag/:tag', authUser, getDatabase, links.links);

  app.get('/links/new', authUser, getDatabase, links.newLink);
  app.post('/links/new', authUser, getDatabase, links.newLink);
  app.get('/links/:linkId', authUser, getDatabase, authLink, links.editLink);
  app.post('/links/:linkId', authUser, getDatabase, authLink, links.editLink);
  app.get('/links/:linkId/delete', authUser, getDatabase, authLink, links.deleteLink);
  app.post('/links/:linkId/delete', authUser, getDatabase, authLink, links.deleteLink);
  app.get('/bookmarklet/add', authUser, getDatabase, links.bookmarklet);
  app.post('/bookmarklet/add', authUser, getDatabase, links.bookmarklet);

  app.get('/bookmarklet', links.bookmarkletInfo);

  // Log in & sign up
  var users = require('./controllers/users');
  app.get('/login', getDatabase, users.login);
  app.post('/login', getDatabase, users.postLogin);
  app.get('/register', getDatabase, users.register);
  app.post('/register', getDatabase, users.register);
  app.get('/logout', users.logout);
}
