import React, { act } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import App from '../App';

let mockItems;

const resetMockItems = () => {
  mockItems = [
    {
      id: 1,
      name: 'Buy groceries',
      priority: 'medium',
      due_date: '2026-03-01',
      created_at: '2026-02-01T12:00:00.000Z',
    },
    {
      id: 2,
      name: 'Pay rent',
      priority: 'high',
      due_date: '2026-02-28',
      created_at: '2026-02-02T12:00:00.000Z',
    },
  ];
};

const server = setupServer(
  rest.get('/api/items', (req, res, ctx) => res(ctx.status(200), ctx.json(mockItems))),
  rest.post('/api/items', (req, res, ctx) => {
    const { name, priority, dueDate } = req.body;

    if (!name || !name.trim()) {
      return res(ctx.status(400), ctx.json({ error: 'Item name is required' }));
    }

    const created = {
      id: mockItems.length + 1,
      name,
      priority: priority || 'medium',
      due_date: dueDate || null,
      created_at: new Date().toISOString(),
    };
    mockItems.unshift(created);
    return res(ctx.status(201), ctx.json(created));
  }),
  rest.put('/api/items/:id', (req, res, ctx) => {
    const id = Number(req.params.id);
    const index = mockItems.findIndex((item) => item.id === id);

    if (index < 0) {
      return res(ctx.status(404), ctx.json({ error: 'Item not found' }));
    }

    const { name, priority, dueDate } = req.body;
    const updated = {
      ...mockItems[index],
      name,
      priority,
      due_date: dueDate || null,
    };
    mockItems[index] = updated;

    return res(ctx.status(200), ctx.json(updated));
  }),
  rest.delete('/api/items/:id', (req, res, ctx) => {
    const id = Number(req.params.id);
    mockItems = mockItems.filter((item) => item.id !== id);
    return res(ctx.status(200), ctx.json({ message: 'Item deleted successfully', id }));
  })
);

// Setup and teardown for the mock server
beforeAll(() => server.listen());
beforeEach(() => resetMockItems());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('App Component', () => {
  test('renders the header', async () => {
    await act(async () => {
      render(<App />);
    });
    expect(screen.getByText('Todo App')).toBeInTheDocument();
    expect(screen.getByText(/Add, edit, search, sort/)).toBeInTheDocument();
  });

  test('loads and displays items', async () => {
    await act(async () => {
      render(<App />);
    });
    
    // Initially shows loading state
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
    
    // Wait for items to load
    await waitFor(() => {
      expect(screen.getByText('Buy groceries')).toBeInTheDocument();
      expect(screen.getByText('Pay rent')).toBeInTheDocument();
      expect(screen.getByText('Priority: high')).toBeInTheDocument();
    });
  });

  test('adds a new item with priority and due date', async () => {
    const user = userEvent.setup();
    
    await act(async () => {
      render(<App />);
    });
    
    // Wait for items to load
    await waitFor(() => {
      expect(screen.queryByText('Loading data...')).not.toBeInTheDocument();
    });
    
    // Fill in the form and submit
    const input = screen.getByLabelText('New todo name');
    await act(async () => {
      await user.type(input, 'Finish bootcamp task');
    });

    const addFormPriority = screen.getByLabelText('New todo priority');
    await act(async () => {
      await user.selectOptions(addFormPriority, 'high');
    });

    const dateInput = screen.getByLabelText('New todo due date');
    await act(async () => {
      await user.type(dateInput, '2026-03-10');
    });
    
    const submitButton = screen.getByText('Add');
    await act(async () => {
      await user.click(submitButton);
    });
    
    // Check that the new item appears
    await waitFor(() => {
      expect(screen.getByText('Finish bootcamp task')).toBeInTheDocument();
      expect(screen.getAllByText('Priority: high')[0]).toBeInTheDocument();
      expect(screen.getByText('Due: 2026-03-10')).toBeInTheDocument();
    });
  });

  test('searches todos', async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByText('Buy groceries')).toBeInTheDocument();
      expect(screen.getByText('Pay rent')).toBeInTheDocument();
    });

    await act(async () => {
      await user.type(screen.getByLabelText('Search todos'), 'rent');
    });

    expect(screen.queryByText('Buy groceries')).not.toBeInTheDocument();
    expect(screen.getByText('Pay rent')).toBeInTheDocument();
  });

  test('edits an item', async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByText('Buy groceries')).toBeInTheDocument();
    });

    await act(async () => {
      await user.click(screen.getAllByText('Edit')[0]);
    });

    const editInput = screen.getByDisplayValue('Buy groceries');
    await act(async () => {
      await user.clear(editInput);
      await user.type(editInput, 'Buy groceries and snacks');
      await user.click(screen.getByText('Save'));
    });

    await waitFor(() => {
      expect(screen.getByText('Buy groceries and snacks')).toBeInTheDocument();
    });
  });

  test('deletes an item', async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByText('Pay rent')).toBeInTheDocument();
    });

    await act(async () => {
      await user.click(screen.getAllByText('Delete')[0]);
    });

    await waitFor(() => {
      expect(screen.queryByText('Pay rent')).not.toBeInTheDocument();
    });
  });

  test('handles API error', async () => {
    // Override the default handler to simulate an error
    server.use(
      rest.get('/api/items', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );
    
    await act(async () => {
      render(<App />);
    });
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch data/)).toBeInTheDocument();
    });
  });

  test('shows empty state when no items', async () => {
    // Override the default handler to return empty array
    server.use(
      rest.get('/api/items', (req, res, ctx) => {
        return res(ctx.status(200), ctx.json([]));
      })
    );
    
    await act(async () => {
      render(<App />);
    });
    
    // Wait for empty state message
    await waitFor(() => {
      expect(screen.getByText('No todos found.')).toBeInTheDocument();
    });
  });
});