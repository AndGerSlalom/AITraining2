const { test, expect } = require('@playwright/test');
const { TodoPage } = require('./pages/TodoPage');

const API_BASE_URL = 'http://127.0.0.1:3030';

const clearTodos = async (request) => {
  const response = await request.get(`${API_BASE_URL}/api/items`);
  const items = await response.json();

  for (const item of items) {
    await request.delete(`${API_BASE_URL}/api/items/${item.id}`);
  }
};

test.beforeEach(async ({ request }) => {
  await clearTodos(request);
});

test('adds a todo with priority and due date', async ({ page }) => {
  const todoPage = new TodoPage(page);
  await todoPage.goto();

  await todoPage.addTodo({
    name: 'E2E Add Todo',
    priority: 'high',
    dueDate: '2026-03-10',
  });

  await expect(page.getByText('E2E Add Todo')).toBeVisible();
  await expect(page.getByText('Priority: high')).toBeVisible();
  await expect(page.getByText('Due: 2026-03-10')).toBeVisible();
});

test('searches a todo item', async ({ page }) => {
  const todoPage = new TodoPage(page);
  await todoPage.goto();

  await todoPage.addTodo({ name: 'Unique Searchable Todo', priority: 'medium' });
  await todoPage.addTodo({ name: 'Different Item', priority: 'low' });

  await todoPage.search('searchable');

  await expect(page.getByText('Unique Searchable Todo')).toBeVisible();
  await expect(page.getByText('Different Item')).toHaveCount(0);
});

test('sorts todos by name ascending', async ({ page }) => {
  const todoPage = new TodoPage(page);
  await todoPage.goto();

  await todoPage.addTodo({ name: 'Zulu Task', priority: 'medium' });
  await todoPage.addTodo({ name: 'Alpha Task', priority: 'medium' });

  await todoPage.sortBy.selectOption('name');
  await todoPage.sortOrder.selectOption('asc');

  const todoNames = page.locator('li h6, li .MuiTypography-subtitle1');
  await expect(todoNames.first()).toContainText('Alpha Task');
});

test('edits an existing todo', async ({ page }) => {
  const todoPage = new TodoPage(page);
  await todoPage.goto();

  await todoPage.addTodo({ name: 'Edit Me', priority: 'low' });
  await todoPage.search('Edit Me');
  await todoPage.editFirstVisibleTodo('Edited Successfully');

  await expect(page.getByText('Edited Successfully')).toBeVisible();
});

test('deletes an existing todo', async ({ page }) => {
  const todoPage = new TodoPage(page);
  await todoPage.goto();

  await todoPage.addTodo({ name: 'Delete Me', priority: 'low' });
  await todoPage.search('Delete Me');
  await todoPage.deleteFirstVisibleTodo();

  await expect(page.getByText('No todos found.')).toBeVisible();
});
