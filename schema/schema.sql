CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(32) NOT NULL UNIQUE,
  password_hash VARCHAR(60)
);

CREATE TABLE links (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  title VARCHAR(256),
  url VARCHAR(2048),
  domain VARCHAR(2048),
  note TEXT,
  added TIMESTAMP
);

CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  tag VARCHAR(64) UNIQUE
);

CREATE TABLE taggings (
  id SERIAL PRIMARY KEY,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  link_id INTEGER REFERENCES links(id) ON DELETE CASCADE
);

CREATE INDEX links_user_id_idx ON links (user_id);
CREATE INDEX links_url_idx ON links (url);
CREATE INDEX links_domain_idx ON links (domain);
