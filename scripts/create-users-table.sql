-- Create users table for Discord authentication
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  username TEXT,
  discriminator TEXT,
  avatar TEXT,
  image TEXT,
  last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see only their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Create policy to allow users to update their own data
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Create policy to allow inserting new users (for registration)
CREATE POLICY "Allow user creation" ON users
  FOR INSERT WITH CHECK (true);
