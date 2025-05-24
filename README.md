# Expense Tracker Application

A 3-tier web application for tracking personal expenses with budget management.

## Features

- User authentication (signup/login)
- Monthly budget setting
- Expense tracking by category
- Budget monitoring
- Responsive design

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: FastAPI (Python)
- **Database**: PostgreSQL
- **Web Server**: Nginx

## Running the Application

### Prerequisites

- Docker and Docker Compose installed on your system

### Steps to Run

1. Clone the repository:
   ```
   git clone <repository-url>
   cd fastAPIExample
   ```

2. Build and start the containers:
   ```
   docker-compose up --build
   ```

3. Access the application:
   - Open your browser and navigate to `http://localhost`
   - Sign up for a new account or log in with existing credentials

### Docker Commands

- **Start the application**:
  ```
  docker-compose up
  ```

- **Start in detached mode**:
  ```
  docker-compose up -d
  ```

- **Stop the application**:
  ```
  docker-compose down
  ```

- **View logs**:
  ```
  docker-compose logs
  ```

- **Rebuild containers after changes**:
  ```
  docker-compose up --build
  ```

- **Remove volumes (will delete all data)**:
  ```
  docker-compose down -v
  ```

## API Endpoints

- `POST /token` - User login
- `POST /users/` - Create new user
- `GET /users/me` - Get current user info
- `PUT /users/budget` - Update user's monthly budget
- `POST /expenses/` - Add new expense
- `GET /expenses/` - Get user's expenses
- `GET /expenses/summary` - Get monthly expense summary

## AWS Deployment

This application is designed to be deployed on AWS using:
- Application Load Balancer for the web tier
- ECS for containerized services
- RDS for PostgreSQL database
- S3 and CloudFront for static content delivery