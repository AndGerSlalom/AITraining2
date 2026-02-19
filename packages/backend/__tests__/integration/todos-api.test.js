const request = require('supertest');
const { app, db, resetDatabase } = require('../../src/app');

beforeEach(() => {
  resetDatabase();
});

afterAll(() => {
  if (db) {
    db.close();
  }
});

const createItem = async ({
  name = 'Temp Item',
  priority = 'medium',
  dueDate = null,
} = {}) => {
  const response = await request(app)
    .post('/api/items')
    .send({ name, priority, dueDate })
    .set('Accept', 'application/json');

  expect(response.status).toBe(201);
  return response.body;
};

describe('Todo API integration', () => {
  it('returns empty list initially', async () => {
    const response = await request(app).get('/api/items');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('creates a todo item', async () => {
    const response = await request(app)
      .post('/api/items')
      .send({ name: 'Test Item', priority: 'high', dueDate: '2026-03-01' })
      .set('Accept', 'application/json');

    expect(response.status).toBe(201);
    expect(response.body.name).toBe('Test Item');
    expect(response.body.priority).toBe('high');
    expect(response.body.due_date).toBe('2026-03-01');
    expect(response.body).toHaveProperty('id');
  });

  it('searches todos by name', async () => {
    await createItem({ name: 'Buy milk' });
    await createItem({ name: 'Call landlord' });

    const response = await request(app).get('/api/items?search=milk');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].name).toBe('Buy milk');
  });

  it('updates an existing todo', async () => {
    const created = await createItem({ name: 'Original', priority: 'low' });

    const response = await request(app)
      .put(`/api/items/${created.id}`)
      .send({ name: 'Updated', priority: 'medium', dueDate: '2026-04-01' })
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body.name).toBe('Updated');
    expect(response.body.priority).toBe('medium');
    expect(response.body.due_date).toBe('2026-04-01');
  });

  it('deletes an existing todo', async () => {
    const created = await createItem({ name: 'Delete me' });

    const deleteResponse = await request(app).delete(`/api/items/${created.id}`);
    expect(deleteResponse.status).toBe(200);

    const listResponse = await request(app).get('/api/items');
    expect(listResponse.status).toBe(200);
    expect(listResponse.body).toHaveLength(0);
  });

  it('validates bad inputs', async () => {
    const noName = await request(app).post('/api/items').send({ priority: 'high' });
    expect(noName.status).toBe(400);

    const badPriority = await request(app)
      .post('/api/items')
      .send({ name: 'X', priority: 'urgent' });
    expect(badPriority.status).toBe(400);

    const badDate = await request(app)
      .post('/api/items')
      .send({ name: 'X', priority: 'high', dueDate: '2026-99-99' });
    expect(badDate.status).toBe(400);
  });
});
