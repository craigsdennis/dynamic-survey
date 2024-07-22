-- Migration number: 0001 	 2024-07-20T22:18:58.824Z
CREATE TABLE survey_takers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metadata TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    survey_taker_id INTEGER,
    json_message TEXT NOT NULL,
    metadata TEXT,
    creation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (survey_taker_id) REFERENCES survey_takers(id)
);
CREATE TABLE survey_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    survey_taker_id INTEGER,
    event_name TEXT NOT NULL,
    nps INTEGER NOT NULL,
    attend_again BOOLEAN,
    improvements TEXT,
    favorite_part TEXT,
    email TEXT,
    creation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (survey_taker_id) REFERENCES survey_takers(id)
);
