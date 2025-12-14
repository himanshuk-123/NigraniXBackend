# Backend Authentication API

## Authentication System

This backend provides a complete authentication system using phone number and password.

### Setup Instructions

1. **Configure Database**
   - Update `.env` file with your SQL Server credentials:
     ```
     DB_SERVER=localhost
     DB_NAME=your_database_name
     DB_USER=your_username
     DB_PASSWORD=your_password
     ```

2. **Run Database Schema**
   - Execute `schema.sql` in your SQL Server to create the necessary tables

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Start Server**
   ```bash
   node server.js
   ```

### API Endpoints

#### 1. **Signup** - `POST /api/auth/signup`
Register a new user with phone number and password.

**Request Body:**
```json
{
  "fullName": "John Doe",
  "phoneNumber": "1234567890",
  "password": "securePassword123",
  "email": "john@example.com",
  "role": "CITIZEN",
  "departmentId": null
}
```

**Response (201):**
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": 1,
    "fullName": "John Doe",
    "phoneNumber": "1234567890",
    "email": "john@example.com",
    "role": "CITIZEN",
    "departmentId": null,
    "createdAt": "2025-12-14T10:30:00.000Z"
  }
}
```

#### 2. **Login** - `POST /api/auth/login`
Authenticate user with phone number and password.

**Request Body:**
```json
{
  "phoneNumber": "1234567890",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": 1,
    "fullName": "John Doe",
    "phoneNumber": "1234567890",
    "email": "john@example.com",
    "role": "CITIZEN",
    "departmentId": null,
    "createdAt": "2025-12-14T10:30:00.000Z"
  }
}
```

#### 3. **Verify Token** - `GET /api/auth/verify`
Verify if the authentication token is valid (Protected Route).

**Headers:**
```
Authorization: Bearer <your_token>
```

**Response (200):**
```json
{
  "valid": true,
  "user": {
    "userId": 1,
    "fullName": "John Doe",
    "phoneNumber": "1234567890",
    "email": "john@example.com",
    "role": "CITIZEN",
    "departmentId": null,
    "createdAt": "2025-12-14T10:30:00.000Z"
  }
}
```

#### 4. **Get Profile** - `GET /api/auth/profile`
Get current user's profile (Protected Route).

**Headers:**
```
Authorization: Bearer <your_token>
```

**Response (200):**
```json
{
  "userId": 1,
  "fullName": "John Doe",
  "phoneNumber": "1234567890",
  "email": "john@example.com",
  "role": "CITIZEN",
  "departmentId": 1,
  "departmentName": "PWD",
  "createdAt": "2025-12-14T10:30:00.000Z"
}
```

### Security Features

- ✅ **Password Hashing**: Uses bcrypt with 10 salt rounds
- ✅ **JWT Authentication**: Secure token-based authentication
- ✅ **Phone Number Validation**: Validates format (10-15 digits)
- ✅ **Role-Based Access**: Supports CITIZEN, STAFF, and ADMIN roles
- ✅ **Unique Constraints**: Prevents duplicate phone numbers
- ✅ **Protected Routes**: Middleware for authentication verification

### User Roles

- **CITIZEN**: Regular users who can report issues
- **STAFF**: Department staff who can resolve issues
- **ADMIN**: System administrators with full access

### Error Codes

- `400`: Bad Request (missing or invalid data)
- `401`: Unauthorized (invalid credentials)
- `403`: Forbidden (invalid token)
- `404`: Not Found (user doesn't exist)
- `409`: Conflict (phone number already registered)
- `500`: Internal Server Error
