# Knot

This is a full-stack, real-time chat application built with a modern tech stack. It features a sleek, dark-themed, and mobile-first design.

## Features

*   **Real-time Communication:** Chat with other users instantly without needing to refresh the page.
*   **Public and Private Messaging:** Engage in public conversations with all users or have private one-on-one direct messages.
*   **User Authentication:** Secure user registration and login system with password hashing and JWT-based authentication.
*   **Online Status and Typing Indicators:** See who's online and when someone is typing a message.
*   **Network Quality Indicator:** Monitors and displays the quality of your network connection (latency and jitter).
*   **Responsive Design:** A mobile-first design that works beautifully on both desktop and mobile devices.

## Technologies Used

### Frontend

*   **Framework:** [Next.js](https://nextjs.org/) (React)
*   **UI Components:** [Shadcn UI](https://ui.shadcn.com/)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
*   **State Management:** React Hooks
*   **Real-time Communication:** [Socket.IO Client](https://socket.io/docs/v4/client-api/)
*   **Form Handling:** [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/) for validation

### Backend

*   **Framework:** [Express.js](https://expressjs.com/)
*   **Database:** [SQLite](https://www.sqlite.org/index.html)
*   **Real-time Communication:** [Socket.IO](https://socket.io/)
*   **Authentication:** [JSON Web Tokens (JWT)](https://jwt.io/) & [bcrypt](https://www.npmjs.com/package/bcrypt) for password hashing

## Getting Started

### Prerequisites

*   Node.js (v18 or later recommended)
*   pnpm (or npm/yarn)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd modern-chat-app
    ```

2.  **Install frontend dependencies:**
    ```bash
    pnpm install
    ```

3.  **Install backend dependencies:**
    ```bash
    cd backend
    pnpm install
    cd ..
    ```

### Running the Application

1.  **Start the backend server:**
    ```bash
    cd backend
    pnpm dev
    ```
    The backend server will start on `http://localhost:3001`.

2.  **Start the frontend development server:**
    In a new terminal, from the project root:
    ```bash
    pnpm dev
    ```
    The frontend application will be available at `http://localhost:3000`.

3.  **Open your browser** and navigate to `http://localhost:3000` to use the application.
