# Student Performance Dashboard

A comprehensive dashboard application for tracking and analyzing student academic performance. Built with React, Node.js, and MongoDB.

## Features

- Interactive charts and visualizations
- Subject-wise performance tracking
- Attendance monitoring
- CGPA comparison
- Risk assessment for subjects
- Study style analysis
- Career aim tracking

## Tech Stack

- Frontend:
  - React.js
  - Chart.js
  - Tailwind CSS
  - Axios

- Backend:
  - Node.js
  - Express.js
  - MongoDB
  - JWT Authentication

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <your-repository-url>
cd <project-directory>
```

2. Install dependencies:
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

3. Set up environment variables:
Create a `.env` file in the backend directory with the following variables:
```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
PORT=5000
```

4. Start the application:
```bash
# Start backend server
cd backend
npm start

# Start frontend development server
cd frontend
npm run dev
```

## Usage

1. Register/Login to your account
2. Complete the academic assessment quiz
3. View your personalized dashboard with:
   - Subject performance analysis
   - Attendance tracking
   - CGPA comparison
   - Risk assessment
   - Study style insights

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details . #