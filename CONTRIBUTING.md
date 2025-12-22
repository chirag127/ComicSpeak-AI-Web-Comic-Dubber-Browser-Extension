# Contributing to ComicNarrate-AI-Web-Comic-Dubber-Browser-Extension

We welcome contributions from the community! Whether you're fixing a bug, adding a new feature, or improving documentation, your help is valuable. Please take a moment to review these guidelines to make the contribution process as smooth as possible.

## Code of Conduct

All contributors are expected to adhere to our [Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/code_of_conduct.md). Please be respectful and professional in all your interactions.

## How to Contribute

### Reporting Bugs

If you encounter a bug, please open an issue on our [GitHub issue tracker](https://github.com/chirag127/ComicNarrate-AI-Web-Comic-Dubber-Browser-Extension/issues).
- **Search existing issues** to see if the bug has already been reported.
- **Provide a clear and descriptive title**.
- **Include a detailed description** of the bug, including steps to reproduce it, the expected behavior, and the actual behavior.
- **Provide screenshots** if they help to illustrate the problem.

### Suggesting Enhancements

If you have an idea for a new feature or an improvement to an existing one, please open an issue to discuss it.
- **Provide a clear and descriptive title**.
- **Explain the enhancement** in detail and why you think it would be a valuable addition to the project.

### Submitting Pull Requests

1.  **Fork the repository** and create a new branch from `main` for your changes.
2.  **Make your changes** in your forked repository.
3.  **Write tests** for any new code you add.
4.  **Ensure all tests pass** by running `npm test` in the `backend` directory.
5.  **Lint your code** using Biome to ensure it meets our coding standards.
6.  **Submit a pull request** to the `main` branch of the main repository.
7.  **Provide a clear description** of the changes you've made and why you've made them.

## Development Setup

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/chirag127/ComicNarrate-AI-Web-Comic-Dubber-Browser-Extension.git
    ```
2.  **Install backend dependencies:**
    ```sh
    cd backend
    npm install
    ```
3.  **Install extension dependencies:**
    ```sh
    cd ../extension
    npm install
    ```
4.  **Create a `.env` file** in the `backend` directory and add your `CEREBRAS_API_KEY`:
    ```
    CEREBRAS_API_KEY=your_api_key
    ```
5.  **Start the backend server:**
    ```sh
    cd backend
    npm start
    ```

## Coding Standards

-   **JavaScript:** We use [Biome](https://biomejs.dev/) for linting and formatting. Please ensure your code is free of linting errors before submitting a pull request.
-   **Commit Messages:** We follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification. Please format your commit messages accordingly.

Thank you for your contributions!
