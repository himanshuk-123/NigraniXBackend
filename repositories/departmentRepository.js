const { sql, getPool } = require('../db');

class DepartmentRepository {
    async getAll() {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT DepartmentId, DepartmentName, Latitude, Longitude
            FROM Departments
            ORDER BY DepartmentName
        `);
        return result.recordset;
    }
}

module.exports = new DepartmentRepository();
