-- SQL Script to Check and Update Staff Users with Department Assignment
-- Run this in your SQL Server Management Studio or SQL command line

USE [your_database_name];  -- Replace with your actual database name

-- STEP 1: Check all existing staff users
PRINT '=== EXISTING STAFF USERS ==='
SELECT 
    UserId, 
    FullName, 
    phone_number, 
    Role, 
    DepartmentId,
    (SELECT DepartmentName FROM Departments WHERE DepartmentId = Users.DepartmentId) as DepartmentName
FROM Users
WHERE Role = 'STAFF';

-- STEP 2: Show available departments
PRINT '=== AVAILABLE DEPARTMENTS ==='
SELECT DepartmentId, DepartmentName FROM Departments;

-- STEP 3: UPDATE - Assign all STAFF users without a department to PWD (DepartmentId = 1)
PRINT '=== UPDATING STAFF USERS ==='
UPDATE Users
SET DepartmentId = 1  -- PWD Department
WHERE Role = 'STAFF' AND DepartmentId IS NULL;

-- OR if you want to assign specific staff to specific departments, use:
-- UPDATE Users SET DepartmentId = 1 WHERE phone_number = '9876543210';  -- PWD
-- UPDATE Users SET DepartmentId = 2 WHERE phone_number = '9876543211';  -- Sanitation
-- UPDATE Users SET DepartmentId = 3 WHERE phone_number = '9876543212';  -- Electricity
-- UPDATE Users SET DepartmentId = 4 WHERE phone_number = '9876543213';  -- Water

-- STEP 4: Verify the update
PRINT '=== UPDATED STAFF USERS ==='
SELECT 
    UserId, 
    FullName, 
    phone_number, 
    Role, 
    DepartmentId,
    (SELECT DepartmentName FROM Departments WHERE DepartmentId = Users.DepartmentId) as DepartmentName
FROM Users
WHERE Role = 'STAFF';
