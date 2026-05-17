import express from 'express'
import bcrypt from 'bcryptjs'
import { protect } from '../middleware/auth.js'
import { db } from '../config/prisma.js'

const router = express.Router()

const safeEmp = ({ passwordHash, ...e }) => e

// Employees
router.get('/employees', protect, async (req, res) => {
  const employees = await db.employee.findMany({
    orderBy: { name: 'asc' },
    include: { department: { select: { id: true, name: true } } },
  })
  res.json({ success: true, data: { employees: employees.map(safeEmp) } })
})

router.post('/employees', protect, async (req, res) => {
  const { name, email, phone, password = 'Temp@1234', employeeId, departmentId, role, salary, joinDate, address, status, notes } = req.body
  if (!name || !email) return res.status(400).json({ success: false, message: 'Name and email required' })
  const passwordHash = await bcrypt.hash(password, 12)
  const employee = await db.employee.create({
    data: {
      name, email, phone, passwordHash, employeeId,
      departmentId: departmentId || null, role, status: status || 'active',
      salary: salary ? Number(salary) : null,
      joinDate: joinDate ? new Date(joinDate) : null,
      address, notes,
    },
    include: { department: { select: { id: true, name: true } } },
  })
  res.status(201).json({ success: true, data: { employee: safeEmp(employee) } })
})

router.put('/employees/:id', protect, async (req, res) => {
  const { name, phone, employeeId, departmentId, role, salary, joinDate, address, status, notes } = req.body
  const employee = await db.employee.update({
    where: { id: req.params.id },
    data: {
      name, phone, employeeId,
      departmentId: departmentId || null, role,
      salary: salary !== undefined ? Number(salary) : undefined,
      joinDate: joinDate ? new Date(joinDate) : undefined,
      address, status, notes,
    },
    include: { department: { select: { id: true, name: true } } },
  })
  res.json({ success: true, data: { employee: safeEmp(employee) } })
})

// Departments
router.get('/departments', protect, async (req, res) => {
  const departments = await db.department.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { employees: true } } }
  })
  res.json({ success: true, data: { departments } })
})

router.post('/departments', protect, async (req, res) => {
  const { name, description } = req.body
  if (!name) return res.status(400).json({ success: false, message: 'Name required' })
  const department = await db.department.create({ data: { name, description } })
  res.status(201).json({ success: true, data: { department } })
})

router.put('/departments/:id', protect, async (req, res) => {
  const { name, description } = req.body
  const department = await db.department.update({ where: { id: req.params.id }, data: { name, description } })
  res.json({ success: true, data: { department } })
})

export default router
