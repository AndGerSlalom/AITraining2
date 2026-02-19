import React, { useState, useEffect, useMemo } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  List,
  ListItem,
  Paper,
  Stack,
  TextField,
  ThemeProvider,
  Typography,
  createTheme,
} from '@mui/material';

const PRIORITY_ORDER = {
  low: 1,
  medium: 2,
  high: 3,
};

const appTheme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#fbc02d',
    },
    background: {
      default: '#f7f9fc',
    },
  },
});

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
    <ThemeProvider theme={appTheme}>
      <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', py: 4 }}>
        <Container maxWidth="md">
          <Paper sx={{ p: 3, mb: 3 }} elevation={2}>
            <Typography variant="h4" component="h1" gutterBottom>
              Todo App
            </Typography>
            <Typography color="text.secondary">
              Add, edit, search, sort, and manage priorities and due dates.
            </Typography>
          </Paper>

          <Paper sx={{ p: 3, mb: 3 }} elevation={2}>
            <Typography variant="h6" gutterBottom>Add Todo</Typography>
            <Box component="form" onSubmit={handleSubmit}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField
                  fullWidth
                  label="New todo name"
                  value={newTodo.name}
                  onChange={(e) => setNewTodo({ ...newTodo, name: e.target.value })}
                />
                <TextField
                  select
                  label="New todo priority"
                  value={newTodo.priority}
                  onChange={(e) => setNewTodo({ ...newTodo, priority: e.target.value })}
                  SelectProps={{ native: true }}
                  sx={{ minWidth: 160 }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </TextField>
                <TextField
                  type="date"
                  label="New todo due date"
                  InputLabelProps={{ shrink: true }}
                  value={newTodo.dueDate}
                  onChange={(e) => setNewTodo({ ...newTodo, dueDate: e.target.value })}
                  sx={{ minWidth: 190 }}
                />
                <Button variant="contained" type="submit" sx={{ bgcolor: 'secondary.main', color: 'black' }}>
                  Add
                </Button>
              </Stack>
            </Box>
          </Paper>

          <Paper sx={{ p: 3, mb: 3 }} elevation={2}>
            <Typography variant="h6" gutterBottom>Search and Sort</Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label="Search todos"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <TextField
                select
                label="Sort by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                SelectProps={{ native: true }}
                sx={{ minWidth: 200 }}
              >
                <option value="created_at">Sort by Created Date</option>
                <option value="name">Sort by Name</option>
                <option value="priority">Sort by Priority</option>
                <option value="due_date">Sort by Due Date</option>
              </TextField>
              <TextField
                select
                label="Sort order"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                SelectProps={{ native: true }}
                sx={{ minWidth: 160 }}
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </TextField>
            </Stack>
          </Paper>

          <Paper sx={{ p: 3 }} elevation={2}>
            <Typography variant="h6" gutterBottom>Todos</Typography>
            {loading && (
              <Stack direction="row" spacing={2} alignItems="center">
                <CircularProgress size={22} />
                <Typography>Loading data...</Typography>
              </Stack>
            )}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {!loading && !error && (
              <List sx={{ p: 0 }}>
                {filteredAndSortedTodos.length > 0 ? (
                  filteredAndSortedTodos.map((item) => (
                    <ListItem key={item.id} divider sx={{ px: 0 }}>
                      {editingId === item.id ? (
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ width: '100%' }}>
                          <TextField
                            fullWidth
                            label="Edit todo name"
                            value={editTodo.name}
                            onChange={(e) => setEditTodo({ ...editTodo, name: e.target.value })}
                          />
                          <TextField
                            select
                            label="Edit todo priority"
                            value={editTodo.priority}
                            onChange={(e) => setEditTodo({ ...editTodo, priority: e.target.value })}
                            SelectProps={{ native: true }}
                            sx={{ minWidth: 140 }}
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                          </TextField>
                          <TextField
                            type="date"
                            label="Edit todo due date"
                            InputLabelProps={{ shrink: true }}
                            value={editTodo.dueDate}
                            onChange={(e) => setEditTodo({ ...editTodo, dueDate: e.target.value })}
                            sx={{ minWidth: 190 }}
                          />
                          <Button type="button" variant="contained" onClick={() => handleEditSave(item.id)}>Save</Button>
                          <Button type="button" variant="outlined" onClick={handleEditCancel}>Cancel</Button>
                        </Stack>
                      ) : (
                        <Stack
                          direction={{ xs: 'column', md: 'row' }}
                          justifyContent="space-between"
                          alignItems={{ xs: 'flex-start', md: 'center' }}
                          spacing={2}
                          sx={{ width: '100%' }}
                        >
                          <Box>
                            <Typography variant="subtitle1" fontWeight={700}>{item.name}</Typography>
                            <Typography variant="body2">Priority: {item.priority}</Typography>
                            <Typography variant="body2">Due: {item.due_date ? item.due_date.slice(0, 10) : '—'}</Typography>
                          </Box>
                          <Stack direction="row" spacing={1}>
                            <Button type="button" variant="outlined" onClick={() => handleEditStart(item)}>Edit</Button>
                            <Button type="button" variant="contained" color="secondary" onClick={() => handleDelete(item.id)} sx={{ color: 'black' }}>
                              Delete
                            </Button>
                          </Stack>
                        </Stack>
                      )}
                    </ListItem>
                  ))
                ) : (
                  <Typography>No todos found.</Typography>
                )}
              </List>
            )}
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;