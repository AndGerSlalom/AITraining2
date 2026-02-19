const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const Database = require('better-sqlite3');

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Initialize in-memory SQLite database
const db = new Database(':memory:');

const ALLOWED_PRIORITIES = ['low', 'medium', 'high'];

const isValidDateString = (value) => {
  if (!value) {
    return false;
  }

  return !Number.isNaN(Date.parse(value));
};

const normalizePriority = (priority) => {
  if (typeof priority !== 'string') {
    return null;
  }

  const normalized = priority.trim().toLowerCase();
  return ALLOWED_PRIORITIES.includes(normalized) ? normalized : null;
};

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium',
    due_date TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

// Insert some initial data
const initialItems = [
  { name: 'Item 1', priority: 'medium', dueDate: null },
  { name: 'Item 2', priority: 'high', dueDate: null },
  { name: 'Item 3', priority: 'low', dueDate: null },
];

const insertStmt = db.prepare('INSERT INTO items (name, priority, due_date) VALUES (?, ?, ?)');
const getByIdStmt = db.prepare('SELECT * FROM items WHERE id = ?');
const getAllStmt = db.prepare('SELECT * FROM items ORDER BY created_at DESC, id DESC');
const deleteStmt = db.prepare('DELETE FROM items WHERE id = ?');
const updateStmt = db.prepare(`
  UPDATE items
  SET name = ?, priority = ?, due_date = ?
  WHERE id = ?
`);

initialItems.forEach(item => {
  insertStmt.run(item.name, item.priority, item.dueDate);
});

console.log('In-memory database initialized with sample data');

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Backend server is running' });
});

// API Routes
app.get('/api/items', (req, res) => {
  try {
    const items = getAllStmt.all();
    res.json(items);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

app.post('/api/items', (req, res) => {
  try {
    const { name, priority, dueDate } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Item name is required' });
    }

    const normalizedPriority = priority === undefined ? 'medium' : normalizePriority(priority);
    if (!normalizedPriority) {
      return res.status(400).json({ error: 'Priority must be low, medium, or high' });
    }

    if (dueDate !== undefined && dueDate !== null && !isValidDateString(dueDate)) {
      return res.status(400).json({ error: 'Due date must be a valid date' });
    }

    const result = insertStmt.run(name.trim(), normalizedPriority, dueDate ?? null);
    const id = result.lastInsertRowid;

    const newItem = getByIdStmt.get(id);
    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

app.put('/api/items/:id', (req, res) => {
  try {
    const { id } = req.params;

    if (!id || Number.isNaN(Number(id))) {
      return res.status(400).json({ error: 'Valid item ID is required' });
    }

    const existingItem = getByIdStmt.get(id);
    if (!existingItem) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const { name, priority, dueDate } = req.body;

    const updatedName = name === undefined ? existingItem.name : name;
    if (!updatedName || typeof updatedName !== 'string' || updatedName.trim() === '') {
      return res.status(400).json({ error: 'Item name is required' });
    }

    const updatedPriority = priority === undefined ? existingItem.priority : normalizePriority(priority);
    if (!updatedPriority) {
      return res.status(400).json({ error: 'Priority must be low, medium, or high' });
    }

    const updatedDueDate = dueDate === undefined ? existingItem.due_date : dueDate;
    if (updatedDueDate !== null && updatedDueDate !== '' && !isValidDateString(updatedDueDate)) {
      return res.status(400).json({ error: 'Due date must be a valid date' });
    }

    updateStmt.run(updatedName.trim(), updatedPriority, updatedDueDate || null, id);
    const updatedItem = getByIdStmt.get(id);

    return res.json(updatedItem);
  } catch (error) {
    console.error('Error updating item:', error);
    return res.status(500).json({ error: 'Failed to update item' });
  }
});

app.delete('/api/items/:id', (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'Valid item ID is required' });
    }

    const existingItem = getByIdStmt.get(id);
    if (!existingItem) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const result = deleteStmt.run(id);

    if (result.changes > 0) {
      res.json({ message: 'Item deleted successfully', id: parseInt(id) });
    } else {
      res.status(404).json({ error: 'Item not found' });
    }
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

module.exports = { app, db };