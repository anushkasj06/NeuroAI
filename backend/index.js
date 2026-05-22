const express = require('express');
const app = express();
const studentRoutes = require('./routes/studentRoutes');

// ... other middleware ...

app.use('/api/students', studentRoutes); 