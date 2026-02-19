# Coding Guidelines

## Purpose

These guidelines define common coding standards for the project to keep the codebase readable, maintainable, and consistent.

## Core Principles

- Prefer clear and simple solutions over complex implementations.
- Keep code focused on one responsibility per function or module where practical.
- Write code that is easy for teammates to understand and change.

## Naming and Structure

- Use descriptive names for variables, functions, classes, and files.
- Follow existing project naming conventions and folder structure.
- Keep functions small and cohesive.
- Avoid one-letter variable names except in very small local scopes.

## Readability and Consistency

- Follow consistent formatting and linting rules.
- Use consistent style patterns that match existing code.
- Keep conditionals and loops straightforward and readable.
- Remove dead code and unused imports.

## Error Handling

- Validate inputs at boundaries (API, forms, external data).
- Handle errors explicitly and return meaningful error messages.
- Fail safely and avoid exposing sensitive details in errors.

## Security and Reliability

- Never hard-code secrets, tokens, or credentials.
- Prefer environment variables for configuration.
- Sanitize and validate untrusted input.
- Design code to be resilient to invalid states and edge cases.

## Testing Expectations

- Add or update tests for new features and bug fixes.
- Keep tests isolated and deterministic.
- Test behavior and outcomes, not implementation details.

## Documentation and Maintainability

- Keep documentation and comments aligned with current behavior.
- Document non-obvious decisions and trade-offs.
- Refactor duplicated or overly complex code when safe and practical.

## Pull Request Quality

- Keep changes focused and scoped to the task.
- Avoid unrelated refactors in feature or fix PRs.
- Ensure tests and lint checks pass before merge.
