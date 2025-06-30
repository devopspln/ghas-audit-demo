// INTENTIONALLY VULNERABLE CODE FOR DEMONSTRATION PURPOSES
// DO NOT USE IN PRODUCTION

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const _ = require('lodash');

const app = express();
const PORT = process.env.PORT || 3000;

// VULNERABILITY: Hardcoded secret (will be detected by secret scanning)
const JWT_SECRET = 'super-secret-key-123';
const API_KEY = 'sk_test_4eC39HqLyjWDarjtT1zdp7dc';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize database
const db = new sqlite3.Database(':memory:');

db.serialize(() => {
  db.run(`CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username TEXT,
    password TEXT,
    balance REAL
  )`);
  
  db.run(`CREATE TABLE transactions (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    amount REAL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  // Insert test data
  const hashedPassword = bcrypt.hashSync('password123', 10);
  db.run("INSERT INTO users (username, password, balance) VALUES ('admin', ?, 1000)", [hashedPassword]);
  db.run("INSERT INTO users (username, password, balance) VALUES ('user1', ?, 500)", [hashedPassword]);
});

// VULNERABILITY: SQL Injection (will be detected by code scanning)
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  // Vulnerable SQL query - directly concatenating user input
  const query = `SELECT * FROM users WHERE username = '${username}'`;
  
  db.get(query, (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // VULNERABILITY: Weak password comparison
    if (bcrypt.compareSync(password, user.password)) {
      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
      res.json({ token, balance: user.balance });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });
});

// VULNERABILITY: Missing authentication check
app.get('/api/users/:id/balance', (req, res) => {
  const userId = req.params.id;
  
  // No authentication required - anyone can check any user's balance
  db.get('SELECT balance FROM users WHERE id = ?', [userId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ balance: row.balance });
  });
});

// VULNERABILITY: Command injection via user input
app.post('/api/transfer', (req, res) => {
  const { to, amount, description } = req.body;
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const fromUserId = decoded.id;
    
    // VULNERABILITY: No input validation on amount
    db.run('UPDATE users SET balance = balance - ? WHERE id = ?', [amount, fromUserId], (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [amount, to], (err) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        // VULNERABILITY: Storing sensitive data in logs
        console.log(`Transfer: ${fromUserId} -> ${to}, Amount: ${amount}, Description: ${description}`);
        
        // Log transaction
        db.run('INSERT INTO transactions (user_id, amount, description) VALUES (?, ?, ?)',
          [fromUserId, -amount, description]);
        
        res.json({ success: true, message: 'Transfer completed' });
      });
    });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// VULNERABILITY: Directory traversal
app.get('/api/reports/:filename', (req, res) => {
  const filename = req.params.filename;
  
  // Vulnerable to path traversal attacks
  const fs = require('fs');
  const path = require('path');
  
  // No sanitization of filename
  const filePath = path.join(__dirname, 'reports', filename);
  
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.send(data);
  });
});

// VULNERABILITY: Prototype pollution via lodash
app.post('/api/settings', (req, res) => {
  const settings = req.body;
  
  // Using vulnerable lodash version (4.17.4)
  const currentSettings = { theme: 'light', notifications: true };
  const newSettings = _.merge(currentSettings, settings);
  
  res.json({ settings: newSettings });
});

// VULNERABILITY: Exposed admin endpoint
app.get('/api/admin/users', (req, res) => {
  // No authentication required for admin endpoint
  db.all('SELECT id, username, balance FROM users', (err, users) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ users });
  });
});

// VULNERABILITY: XXE via XML parsing
app.post('/api/import', (req, res) => {
  const xml2js = require('xml2js');
  const parser = new xml2js.Parser({
    // Vulnerable configuration
    xmlParserOptions: {
      dtdload: true,
      doctype: true,
      external: true
    }
  });
  
  parser.parseString(req.body, (err, result) => {
    if (err) {
      return res.status(400).json({ error: 'Invalid XML' });
    }
    res.json({ imported: true, data: result });
  });
});

app.listen(PORT, () => {
  console.log(`Payment API server running on port ${PORT}`);
  console.log('WARNING: This is intentionally vulnerable code for demonstration only!');
});
