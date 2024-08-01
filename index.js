const express = require('express')
var bodyParser = require('body-parser')
const fs = require('fs');
const app = express()
const port = 3000

const departmentFilePath = 'departments.json';
const employeeFilePath = 'employees.json';

app.use(bodyParser.json())

// Hàm để đọc file
function readFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return [];
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
}

// Hàm để ghi file
function writeFile(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

app.get('/', (req, res) => {
    res.send('Operate!!!')
})

// API thêm department, kiểm tra tồn tại trước khi thêm
app.post('/department', (req, res) => {
    const departments = readFile(departmentFilePath);
    const newDepartment = req.body;
    
    // Kiểm tra xem phòng ban đã tồn tại hay chưa
    const exists = departments.some(dep => dep.Name === newDepartment.Name || dep.DirectorId === newDepartment.DirectorId);
    
    if (exists) {
        res.status(400).send({ message: 'Department already exists!' });
    } else {
        departments.push(newDepartment);
        writeFile(departmentFilePath, departments);
        res.send({ data: newDepartment, message: 'Added department successfully!' });
    }
});

// API cập nhật department
app.put('/department', (req, res) => {
    const departments = readFile(departmentFilePath);
    const updatedDepartment = req.body;
    const index = departments.findIndex(dep => dep.DirectorId === updatedDepartment.DirectorId);
    
    if (index !== -1) {
        departments[index] = updatedDepartment;
        writeFile(departmentFilePath, departments);
        res.send({ data: updatedDepartment, message: 'Updated department successfully!' });
    } else {
        res.status(404).send({ message: 'Department not found!' });
    }
});

// API xóa department với DirectorId trong params
app.delete('/department/:DirectorId', (req, res) => {
    const departments = readFile(departmentFilePath);
    const { DirectorId } = req.params;
    const newDepartments = departments.filter(dep => dep.DirectorId !== DirectorId);
    
    if (departments.length === newDepartments.length) {
        res.status(404).send({ message: 'Department not found!' });
    } else {
        writeFile(departmentFilePath, newDepartments);
        res.send({ message: 'Deleted department successfully!' });
    }
});

// APIs cho Employee
app.post('/employee', (req, res) => {
    const employees = readFile(employeeFilePath);
    const newEmployee = req.body;
    const employeeExists = employees.some(emp => emp.Email === newEmployee.Email || emp.Phone === newEmployee.Phone);

    if (employeeExists) {
        res.status(400).send({ message: 'Employee already exists!' });
    } else {
        employees.push(newEmployee);
        writeFile(employeeFilePath, employees);
        res.send({ data: newEmployee, message: 'Added employee successfully!' });
    }
});

app.put('/employee', (req, res) => {
    const employees = readFile(employeeFilePath);
    const updatedEmployee = req.body;
    const index = employees.findIndex(emp => emp.Email === updatedEmployee.Email);

    if (index !== -1) {
        employees[index] = updatedEmployee;
        writeFile(employeeFilePath, employees);
        res.send({ data: updatedEmployee, message: 'Updated employee successfully!' });
    } else {
        res.status(404).send({ message: 'Employee not found!' });
    }
});

app.delete('/employee/:Email', (req, res) => {
    const employees = readFile(employeeFilePath);
    const { Email } = req.params;
    const newEmployees = employees.filter(emp => emp.Email !== Email);

    if (employees.length === newEmployees.length) {
        res.status(404).send({ message: 'Employee not found!' });
    } else {
        writeFile(employeeFilePath, newEmployees);
        res.send({ message: 'Deleted employee successfully!' });
    }
});

// API để tính mức lương trung bình của một phòng ban
app.get('/department/:DepartmentId/average-salary', (req, res) => {
    const { DepartmentId } = req.params;
    const employees = readFile(employeeFilePath);
    const departmentEmployees = employees.filter(emp => emp.DepartmentId === DepartmentId);

    if (departmentEmployees.length === 0) {
        return res.status(404).send({ message: 'No employees found in this department!' });
    }

    const totalSalary = departmentEmployees.reduce((sum, emp) => sum + emp.Salary, 0);
    const averageSalary = totalSalary / departmentEmployees.length;

    res.send({ averageSalary });
});

// API để tìm phòng ban có mức lương trung bình cao nhất
app.get('/department/highest-average-salary', (req, res) => {
    const departments = readFile(departmentFilePath);
    const employees = readFile(employeeFilePath);

    // Tạo đối tượng lưu trữ tổng lương và số lượng nhân viên cho mỗi phòng ban
    const salaryData = {};

    employees.forEach(employee => {
        if (!salaryData[employee.DepartmentId]) {
            salaryData[employee.DepartmentId] = { totalSalary: 0, count: 0 };
        }
        salaryData[employee.DepartmentId].totalSalary += employee.Salary;
        salaryData[employee.DepartmentId].count += 1;
    });

    // Tính mức lương trung bình cho mỗi phòng ban và tìm phòng ban có mức lương trung bình cao nhất
    let highestAvgSalaryDept = null;
    let highestAvgSalary = 0;

    for (const deptId in salaryData) {
        const avgSalary = salaryData[deptId].totalSalary / salaryData[deptId].count;
        if (avgSalary > highestAvgSalary) {
            highestAvgSalary = avgSalary;
            highestAvgSalaryDept = departments.find(dept => dept.DirectorId === deptId);
        }
    }

    if (highestAvgSalaryDept) {
        res.send({
            department: highestAvgSalaryDept,
            averageSalary: highestAvgSalary
        });
    } else {
        res.status(404).send({ message: 'No departments found!' });
    }
});

// API để tìm nhân viên có mức lương cao nhất trong phòng ban
app.get('/department/:DepartmentId/highest-salary-employee', (req, res) => {
    const { DepartmentId } = req.params;
    const employees = readFile(employeeFilePath);
    
    // Lọc nhân viên theo phòng ban
    const departmentEmployees = employees.filter(emp => emp.DepartmentId === DepartmentId);

    if (departmentEmployees.length === 0) {
        return res.status(404).send({ message: 'No employees found in this department!' });
    }

    // Tìm nhân viên có mức lương cao nhất
    const highestSalaryEmployee = departmentEmployees.reduce((max, emp) => emp.Salary > max.Salary ? emp : max, departmentEmployees[0]);

    res.send({ 
        employee: highestSalaryEmployee
    });
});

// API để trả về danh sách các trưởng phòng
app.get('/directors', (req, res) => {
    const departments = readFile(departmentFilePath);

    // Lọc các trưởng phòng
    const directors = departments.map(department => ({
        Name: department.Name,
        DirectorId: department.DirectorId,
        Description: department.Description
    }));

    if (directors.length === 0) {
        return res.status(404).send({ message: 'No directors found!' });
    }

    res.send({ directors });
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
})