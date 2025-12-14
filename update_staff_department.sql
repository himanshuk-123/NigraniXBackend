-- Update staff users to assign them to departments
-- This script assigns staff members to departments so they can view tasks

-- Check existing staff users without departments
SELECT UserId, FullName, phone_number, Role, DepartmentId
FROM Users
WHERE Role = 'STAFF' AND DepartmentId IS NULL;

-- Update staff users - assign to PWD department (DepartmentId = 1)
-- Modify the phone number to match your actual staff user
UPDATE Users
SET DepartmentId = 1  -- PWD department
WHERE Role = 'STAFF' AND phone_number = '9876543210';  -- Replace with actual staff phone number

-- Or update all staff users without a department to PWD
-- UPDATE Users
-- SET DepartmentId = 1
-- WHERE Role = 'STAFF' AND DepartmentId IS NULL;

-- Verify the update
SELECT UserId, FullName, phone_number, Role, DepartmentId, 
       (SELECT DepartmentName FROM Departments WHERE DepartmentId = Users.DepartmentId) as DepartmentName
FROM Users
WHERE Role = 'STAFF';
