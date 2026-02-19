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
const ALLOWED_SORT_FIELDS = ['created_at', 'name', 'priority', 'due_date'];
const ALLOWED_SORT_ORDERS = ['asc', 'desc'];

const isValidDateString = (value) => {
  if (typeof value !== 'string') {
    return false;
  }

  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return false;
  }

  const [year, month, day] = trimmed.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
  );
};

const normalizePriority = (priority) => {
  if (typeof priority !== 'string') {
    return null;
  }

  const normalized = priority.trim().toLowerCase();
  return ALLOWED_PRIORITIES.includes(normalized) ? normalized : null;
};

const normalizeName = (name) => {
  if (typeof name !== 'string') {
    return null;
  }

  const normalized = name.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeSortBy = (sortBy) => {
  if (typeof sortBy !== 'string') {
    return 'created_at';
  }

  const normalized = sortBy.trim().toLowerCase();
  return ALLOWED_SORT_FIELDS.includes(normalized) ? normalized : 'created_at';
};

const normalizeSortOrder = (order) => {
  if (typeof order !== 'string') {
    return 'desc';
  }

  const normalized = order.trim().toLowerCase();
  return ALLOWED_SORT_ORDERS.includes(normalized) ? normalized : 'desc';
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

const insertStmt = db.prepare('INSERT INTO items (name, priority, due_date) VALUES (?, ?, ?)');
const getByIdStmt = db.prepare('SELECT * FROM items WHERE id = ?');
const deleteStmt = db.prepare('DELETE FROM items WHERE id = ?');
const clearTableStmt = db.prepare('DELETE FROM items');
const updateStmt = db.prepare(`
  UPDATE items
  SET name = ?, priority = ?, due_date = ?
  WHERE id = ?
`);

const resetDatabase = (items = []) => {
  clearTableStmt.run();

  items.forEach((item) => {
    const normalizedName = normalizeName(item.name);
    const normalizedPriority = normalizePriority(item.priority || 'medium') || 'medium';
    const dueDate = item.dueDate && isValidDateString(item.dueDate) ? item.dueDate : null;

    if (normalizedName) {
      insertStmt.run(normalizedName, normalizedPriority, dueDate);
    }
  });
};

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Backend server is running' });
});

// API Routes
app.get('/api/items', (req, res) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
    const sortBy = normalizeSortBy(req.query.sortBy);
    const order = normalizeSortOrder(req.query.order);

    const sortExpression =
      sortBy === 'name'
        ? `name ${order.toUpperCase()}`
        : sortBy === 'priority'
          ? `CASE priority WHEN 'low' THEN 1 WHEN 'medium' THEN 2 WHEN 'high' THEN 3 END ${order.toUpperCase()}`
          : sortBy === 'due_date'
            ? `CASE WHEN due_date IS NULL THEN 1 ELSE 0 END ASC, due_date ${order.toUpperCase()}`
            : `created_at ${order.toUpperCase()}, id ${order.toUpperCase()}`;

    const query = `
      SELECT * FROM items
      WHERE (? = '' OR LOWER(name) LIKE '%' || ? || '%' OR LOWER(priority) LIKE '%' || ? || '%' OR LOWER(COALESCE(due_date, '')) LIKE '%' || ? || '%')
      ORDER BY ${sortExpression}
    `;

    const items = db.prepare(query).all(search, search, search, search);
    res.json(items);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

app.post('/api/items', (req, res) => {
  try {
    const { name, priority, dueDate } = req.body;

    const normalizedName = normalizeName(name);
    if (!normalizedName) {
      return res.status(400).json({ error: 'Item name is required' });
    }

    const normalizedPriority = priority === undefined ? 'medium' : normalizePriority(priority);
    if (!normalizedPriority) {
      return res.status(400).json({ error: 'Priority must be low, medium, or high' });
    }

    if (dueDate !== undefined && dueDate !== null && dueDate !== '' && !isValidDateString(dueDate)) {
      return res.status(400).json({ error: 'Due date must be a valid date' });
    }

    const result = insertStmt.run(normalizedName, normalizedPriority, dueDate || null);
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
    const normalizedName = normalizeName(updatedName);
    if (!normalizedName) {
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

    updateStmt.run(normalizedName, updatedPriority, updatedDueDate || null, id);
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

module.exports = {
  app,
  db,
  resetDatabase,
  isValidDateString,
  normalizePriority,
  normalizeName,
  normalizeSortBy,
  normalizeSortOrder,
};