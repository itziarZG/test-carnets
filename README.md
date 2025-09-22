# AFA Carnet Generator

A simple web application to generate PDF membership cards from an Excel file.

## Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-folder>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Create an environment file:**
    Create a file named `.env` in the root of the project and add the application password:
    ```
    APP_PASSWORD=your_secret_password
    ```

## Running the Application

1.  **Start the server:**
    ```bash
    node server.js
    ```

2.  Open your browser and navigate to `http://localhost:3000`.

## Usage

1.  Log in using the password you set in the `.env` file.
2.  Enter the current school year (e.g., "2025-2026").
3.  Upload the `SOCIS.xlsx` file with the member data.
4.  A `carnets.zip` file containing all the generated PDF cards will be downloaded automatically.
