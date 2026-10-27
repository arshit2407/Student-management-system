# Thapar Student Management System

A beginner-friendly MERN application for managing student groups, student records, daily attendance, and simple rule-based attendance insights.

## Features

- User registration and login with JWT authentication.
- Protected pages and API routes.
- Create and delete custom student groups.
- Keep separate student lists for every group and user.
- Add, edit, delete, and import students from CSV, XLS, or XLSX files.
- Numeric roll numbers that are unique for each user's students.
- Daily attendance sheet with present/absent status.
- Attendance history displayed in a spreadsheet-style table.
- Rule-based assistant insights for unusual absence levels and repeated absences.
- Deleting a group also deletes its students and attendance records.

## Tech Stack

- Frontend: React (Create React App), React Router, Axios, CSS
- Backend: Node.js, Express, MongoDB, Mongoose
- Authentication: JSON Web Tokens and bcryptjs
- File import: Multer and SheetJS (`xlsx`)

## Project Structure

```text
Student_Management/
|-- backend/       # Express API and MongoDB models
|-- frontend/      # React Create React App client
`-- README.md
```

## Prerequisites

- Node.js 18 or later
- npm
- A running MongoDB server, local or MongoDB Atlas

## Run Locally

### 1. Start the backend

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

Update `backend/.env`:

```env
MONGO_URI=mongodb://127.0.0.1:27017/student_management
PORT=5000
JWT_SECRET=replace_with_a_long_random_secret
```

Start the API:

```powershell
npm run dev
```

The backend runs at `http://localhost:5000`.

### 2. Start the frontend

Open a second terminal:

```powershell
cd frontend
npm install
npm start
```

The React app opens at `http://localhost:3000`.

## How To Use

1. Register an account, then sign in.
2. Open **Students** and create a group.
3. Open a group to add students manually or import a spreadsheet.
4. Use **Take Attendance** to create a column for the current day and save statuses.
5. Use **Past Attendance** to view only attendance dates already saved.

## Student Import Format

Upload a `.csv`, `.xls`, or `.xlsx` file. The first sheet must contain these columns:

| Name | Email | Roll No |
| --- | --- | --- |
| Rahul Kumar | rahul@example.com | 101 |

- Names can contain letters and spaces only.
- Emails must be valid and cannot repeat within a group.
- Roll numbers must contain digits only and are unique across all groups for the logged-in user.

## Attendance Notes

Attendance is stored as one record per student, group, and date. The current date is only added after attendance is deliberately taken and saved. The assistant uses stored past records and the current submission to flag patterns such as repeated absences, consistently absent students, or absence levels that are lower than usual.

## Documentation

- [Backend API documentation](backend/README.md)
- [Frontend documentation](frontend/README.md)

## Security Notes

- Do not commit `.env` files or real JWT secrets.
- Use a strong `JWT_SECRET` in production.
- Configure frontend API URLs and CORS appropriately before deployment.

## License

This project is intended for educational use.
