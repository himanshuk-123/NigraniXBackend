const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const { authenticateToken } = require('../middleware/auth');

// GET /api/departments - list all departments
router.get('/', authenticateToken, departmentController.getDepartments.bind(departmentController));

module.exports = router;
