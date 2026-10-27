# Backend

Express and MongoDB API for the Student Management System.

## Setup

```powershell
npm install
Copy-Item .env.example .env
```

Configure `.env`:

```env
MONGO_URI=mongodb://127.0.0.1:27017/student_management
PORT=5000
JWT_SECRET=replace_with_a_long_random_secret
```

## Scripts

```powershell
npm run dev    # Start with nodemon
npm start      # Start with Node.js
```

The API defaults to `http://localhost:5000`.

## Authentication

After login, send the returned token with protected requests:

```http
Authorization: Bearer <token>
```

Tokens expire after one day.

## API Endpoints

### Auth

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/auth/register` | Create an account |
| POST | `/api/auth/login` | Sign in and receive a JWT |

Register body:

```json
{ "name": "Teacher Name", "email": "teacher@example.com", "password": "secret123" }
```

Login body:

```json
{ "email": "teacher@example.com", "password": "secret123" }
```

### Groups

All group routes require authentication.

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/groups` | Create a group |
| GET | `/api/groups` | Get the current user's groups |
| GET | `/api/groups/:groupId` | Get one group |
| DELETE | `/api/groups/:groupId` | Delete a group and its data |

Create body:

```json
{ "name": "CSE A" }
```

### Students

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/groups/:groupId/students` | Add a student |
| GET | `/api/groups/:groupId/students` | List students in a group |
| PUT | `/api/groups/:groupId/students/:studentId` | Update a student |
| DELETE | `/api/groups/:groupId/students/:studentId` | Delete a student |
| POST | `/api/groups/:groupId/students/import` | Import students from a file |

Student body:

```json
{ "name": "Rahul Kumar", "email": "rahul@example.com", "rollNo": "101" }
```

Rules:

- Name: letters and spaces only.
- Email: valid and unique within a group.
- Roll number: digits only and unique across all groups owned by the user.

### Student Import

Send `multipart/form-data` with a `file` field. Supported formats are CSV, XLS, and XLSX. The first sheet needs `Name`, `Email`, and `Roll No` columns. Invalid or duplicate rows are skipped and reported in the response.

### Attendance

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/groups/:groupId/attendance` | Save the current day's attendance |
| GET | `/api/groups/:groupId/attendance` | Get attendance history grouped by date |

Save body:

```json
{
  "attendance": [
    { "studentId": "student_id", "status": "present" },
    { "studentId": "another_student_id", "status": "absent" }
  ]
}
```

Each saved record includes the student reference, group reference, date, status, student name, and roll number. One record exists per student per group per date.

## Attendance Assistant

The assistant is deterministic and rule-based; it does not use an external AI service. It compares the current attendance with previous records to identify high or unusually high absence, consecutive absences, consistently absent students, and students who were consistently present before being absent today.

## Data Models

- `User`: name, unique email, hashed password
- `Group`: owner and group name
- `Student`: owner, group, name, email, roll number
- `Attendance`: owner, group, student, student name, roll number, date, status

## Deployment Notes

Set `MONGO_URI`, `JWT_SECRET`, and `PORT` in the hosting environment. Restrict CORS to the deployed frontend origin before production use.
