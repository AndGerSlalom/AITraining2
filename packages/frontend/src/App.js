import React, { useState, useEffect, useMemo } from 'react';
import './App.css';

const PRIORITY_ORDER = {
  low: 1,
  medium: 2,
  high: 3,
};

function App() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newTodo, setNewTodo] = useState({
    name: '',
    priority: 'medium',
    dueDate: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [editingId, setEditingId] = useState(null);
  const [editTodo, setEditTodo] = useState({
    name: '',
    priority: 'medium',
    dueDate: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/items');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const result = await response.json();
      setTodos(result);
      setError(null);
    } catch (err) {
      setError('Failed to fetch data: ' + err.message);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedTodos = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    const filtered = todos.filter((item) => {
      if (!query) {
        return true;
      }

      const dueDateValue = item.due_date ? String(item.due_date).toLowerCase() : '';
      return (
        item.name.toLowerCase().includes(query)
        || item.priority.toLowerCase().includes(query)
        || dueDateValue.includes(query)
      );
    });

    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'priority') {
        comparison = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      } else if (sortBy === 'due_date') {
        const aTime = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY;
        const bTime = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY;
        comparison = aTime - bTime;
      } else if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else {
        const aTime = new Date(a.created_at).getTime();
        const bTime = new Date(b.created_at).getTime();
        comparison = aTime - bTime;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [searchTerm, todos, sortBy, sortOrder]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newTodo.name.trim()) {
      return;
    }

    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newTodo.name,
          priority: newTodo.priority,
          dueDate: newTodo.dueDate || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add item');
      }

      const result = await response.json();
      setTodos([result, ...todos]);
      setNewTodo({ name: '', priority: 'medium', dueDate: '' });
      setError(null);
    } catch (err) {
      setError('Error adding item: ' + err.message);
      console.error('Error adding item:', err);
    }
  };

  const handleEditStart = (item) => {
    setEditingId(item.id);
    setEditTodo({
      name: item.name,
      priority: item.priority,
      dueDate: item.due_date ? item.due_date.slice(0, 10) : '',
    });
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditTodo({ name: '', priority: 'medium', dueDate: '' });
  };

  const handleEditSave = async (itemId) => {
    if (!editTodo.name.trim()) {
      setError('Todo name is required.');
      return;
    }

    try {
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editTodo.name,
          priority: editTodo.priority,
          dueDate: editTodo.dueDate || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update item');
      }

      const updatedItem = await response.json();
      setTodos(todos.map((item) => (item.id === itemId ? updatedItem : item)));
      handleEditCancel();
      setError(null);
    } catch (err) {
      setError('Error editing item: ' + err.message);
      console.error('Error editing item:', err);
    }
  };

  const handleDelete = async (itemId) => {
    try {
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete item');
      }

      setTodos(todos.filter(item => item.id !== itemId));
      setError(null);
    } catch (err) {
      setError('Error deleting item: ' + err.message);
      console.error('Error deleting item:', err);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Todo App</h1>
        <p>Add, edit, search, sort, and manage priorities and due dates.</p>
      </header>

      <main>
        <section className="add-item-section">
          <h2>Add Todo</h2>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              aria-label="New todo name"
              value={newTodo.name}
              onChange={(e) => setNewTodo({ ...newTodo, name: e.target.value })}
              placeholder="Enter todo name"
            />
            <select
              aria-label="New todo priority"
              value={newTodo.priority}
              onChange={(e) => setNewTodo({ ...newTodo, priority: e.target.value })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <input
              type="date"
              aria-label="New todo due date"
              value={newTodo.dueDate}
              onChange={(e) => setNewTodo({ ...newTodo, dueDate: e.target.value })}
            />
            <button type="submit">Add</button>
          </form>
        </section>

        <section className="controls-section">
          <h2>Search and Sort</h2>
          <div className="controls-grid">
            <input
              type="text"
              aria-label="Search todos"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search todos"
            />
            <select aria-label="Sort by" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="created_at">Sort by Created Date</option>
              <option value="name">Sort by Name</option>
              <option value="priority">Sort by Priority</option>
              <option value="due_date">Sort by Due Date</option>
            </select>
            <select aria-label="Sort order" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
        </section>

        <section className="items-section">
          <h2>Todos</h2>
          {loading && <p>Loading data...</p>}
          {error && <p className="error">{error}</p>}
          {!loading && !error && (
            <ul>
              {filteredAndSortedTodos.length > 0 ? (
                filteredAndSortedTodos.map((item) => (
                  <li key={item.id}>
                    {editingId === item.id ? (
                      <div className="todo-edit-row">
                        <input
                          type="text"
                          aria-label="Edit todo name"
                          value={editTodo.name}
                          onChange={(e) => setEditTodo({ ...editTodo, name: e.target.value })}
                        />
                        <select
                          aria-label="Edit todo priority"
                          value={editTodo.priority}
                          onChange={(e) => setEditTodo({ ...editTodo, priority: e.target.value })}
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                        <input
                          type="date"
                          aria-label="Edit todo due date"
                          value={editTodo.dueDate}
                          onChange={(e) => setEditTodo({ ...editTodo, dueDate: e.target.value })}
                        />
                        <button type="button" onClick={() => handleEditSave(item.id)}>Save</button>
                        <button type="button" onClick={handleEditCancel} className="secondary-btn">Cancel</button>
                      </div>
                    ) : (
                      <div className="todo-row">
                        <div className="todo-meta">
                          <strong>{item.name}</strong>
                          <span>Priority: {item.priority}</span>
                          <span>Due: {item.due_date ? item.due_date.slice(0, 10) : '—'}</span>
                        </div>
                        <div className="todo-actions">
                          <button type="button" onClick={() => handleEditStart(item)} className="secondary-btn">Edit</button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="delete-btn"
                            type="button"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))
              ) : (
                <li>No todos found.</li>
              )}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;