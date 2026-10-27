# Frontend

React Create React App client for the Student Management System.

## Setup

```powershell
npm install
npm start
```

The development app runs at `http://localhost:3000`.

Start the backend at `http://localhost:5000` before using the app.

## Scripts

```powershell
npm start       # Development server
npm run build   # Production build
npm test        # Run tests
npm run eject   # CRA eject command
```

## API Configuration

The Axios client in `src/api/axiosInstance.js` uses:

```text
http://localhost:5000/api
```

It automatically sends `Authorization: Bearer <token>` whenever a token is available in `localStorage`.

## Application Routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/register` | Public | Create a user account |
| `/login` | Public | Sign in |
| `/home` | Protected | Dashboard |
| `/students` | Protected | Create and manage groups |
| `/students/:groupId` | Protected | Manage students in a group |
| `/students/:groupId/attendance` | Protected | Take or view group attendance |

Protected routes redirect unauthenticated users to `/login`.

## Main Features

- Registration includes confirm-password, name, and password checks.
- Login stores the JWT in `localStorage` under `token`.
- The navigation bar displays the signed-in user's name and provides logout.
- Groups have independent student lists.
- Student forms support add, edit, delete, and CSV/Excel import.
- Course and sub-group fields are not used; each student has name, email, and numeric roll number.
- Attendance is shown as a horizontally scrollable spreadsheet-style table.
- Take Attendance creates an editable current-date column only after the teacher chooses to take attendance.
- Past Attendance displays saved dates only.
- A red badge marks students with 50% or higher absence across available records.
- After saving attendance, rule-based assistant insights are shown.

## Importing Students

Use **Import File** inside a group. Upload `.csv`, `.xls`, or `.xlsx` files with these headers:

| Name | Email | Roll No |
| --- | --- | --- |
| Rahul Kumar | rahul@example.com | 101 |

The backend validates each row and reports skipped rows.

## Source Layout

```text
src/
|-- api/          # Axios client and API functions
|-- components/   # Shared protected-route component
|-- pages/        # Login, register, groups, students, attendance pages
|-- routes/       # React Router configuration
|-- styles/       # Application stylesheet and image asset
|-- App.js
`-- index.js
```

## Production Build

Run `npm run build` to create the production bundle in `build/`. Before deployment, update the Axios `baseURL` to your deployed backend URL and ensure the backend CORS configuration permits the frontend origin.
