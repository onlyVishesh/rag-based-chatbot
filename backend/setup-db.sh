#!/bin/bash

# Create database and user
sudo -u postgres psql -c "CREATE DATABASE ai_tutor_dev;"
sudo -u postgres psql -c "CREATE USER ai_tutor WITH PASSWORD 'password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ai_tutor_dev TO ai_tutor;"

# Initialize schema
sudo -u postgres psql -d ai_tutor_dev -f src/db/schema.sql

echo "Database setup complete!"