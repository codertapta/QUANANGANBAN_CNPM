const express = require('express'), mysql = require('mysql2/promise'), bcrypt = require('bcryptjs'), jwt = require('jsonwebtoken');
const app = express(); app.use(express.json({ limit: '6mb' }));