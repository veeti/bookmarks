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
	note TEXT,
  added TIMESTAMP
);

CREATE INDEX links_user_id_idx ON links (user_id);
CREATE INDEX links_url_idx ON links (url);
