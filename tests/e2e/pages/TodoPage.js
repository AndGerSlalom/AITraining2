class TodoPage {
  constructor(page) {
    this.page = page;
    this.newTodoName = page.getByLabel('New todo name');
    this.newTodoPriority = page.getByLabel('New todo priority');
    this.newTodoDueDate = page.getByLabel('New todo due date');
    this.searchTodos = page.getByLabel('Search todos');
    this.sortBy = page.getByLabel('Sort by');
    this.sortOrder = page.getByLabel('Sort order');
  }

  async goto() {
    await this.page.goto('/');
    await this.page.getByRole('heading', { name: 'Todo App' }).waitFor();
  }

  async addTodo({ name, priority = 'medium', dueDate = '' }) {
    await this.newTodoName.fill(name);
    await this.newTodoPriority.selectOption(priority);

    if (dueDate) {
      await this.newTodoDueDate.fill(dueDate);
    }

    await this.page.getByRole('button', { name: 'Add' }).click();
  }

  async search(query) {
    await this.searchTodos.fill(query);
  }

  async editFirstVisibleTodo(newName) {
    await this.page.getByRole('button', { name: 'Edit' }).first().click();
    const editName = this.page.getByLabel('Edit todo name');
    await editName.fill(newName);
    await this.page.getByRole('button', { name: 'Save' }).click();
  }

  async deleteFirstVisibleTodo() {
    await this.page.getByRole('button', { name: 'Delete' }).first().click();
  }
}

module.exports = { TodoPage };
