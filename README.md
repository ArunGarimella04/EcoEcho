# EcoEcho v1.0: AI-Powered Sustainability Assistant

EcoEcho is a full-stack mobile application designed to empower users to make a tangible environmental impact. By leveraging AI-driven image recognition, the app demystifies the complex world of waste management, making it easy and rewarding to recycle correctly and track personal contributions to a healthier planet.

## 🌟 Core Functionalities

### 1. AI-Powered Waste Scanning & Classification
The core of EcoEcho is its intelligent scanning feature.
- **Instant Identification**: Simply take a photo of a waste item, and the AI model instantly classifies it (e.g., "Plastic Bottle," "Cardboard," "Glass Jar").
- **Actionable Disposal Guidance**: Receive clear instructions on whether the item is recyclable, compostable, or general waste based on its classification.
- **Eco-Score Impact**: Each correctly logged item contributes to the user's personal Eco Score, providing immediate positive feedback.

### 2. Personalized Impact Dashboard & Analytics
The dashboard provides a comprehensive overview of a user's environmental contributions.
- **Key Metrics**: At-a-glance view of **Total Items Scanned**, **Carbon Saved (kg)**, **Total Weight Diverted**, and overall **Eco Score**.
- **Waste Breakdown**: Interactive charts show the distribution of waste by material (plastic, paper, glass, metal, etc.) and by disposal type (recycled, landfill).
- **Trend Analysis**: Track your recycling habits and impact over time with weekly and monthly progress reports.

### 3. Gamification and Community Engagement
To motivate and sustain user engagement, EcoEcho incorporates several gamified elements.
- **Achievements & Badges**: Unlock badges for reaching milestones, such as "Recycling Rookie," "Plastic Pioneer," or "Sustainability Star."
- **Community Challenges**: Participate in weekly or monthly challenges (e.g., "Recycle 50 plastic bottles") and see how you stack up against the community.
- **Leaderboards**: (Future Feature) Compete on local and global leaderboards based on Eco Score and challenge performance.

### 4. Educational Hub
Knowledge is key to lasting change.
- **Learning Modules**: Access easy-to-read articles and guides on topics like "The Lifecycle of Plastic," "How to Set Up Home Composting," and "Understanding Recycling Symbols."
- **Tips & Tricks**: Get daily or weekly tips on reducing waste and living more sustainably.

### 5. Secure User Management
- **Authentication**: Secure user registration and login flow using JWT (JSON Web Tokens) to protect user data.
- **Profile Management**: Users can view and manage their profile information and track their all-time statistics.

## 🏗️ System Architecture

EcoEcho is built on a microservices-oriented architecture, ensuring scalability and separation of concerns.

```
+------------------------+      (HTTPS/REST)      +-----------------------+      (HTTP/REST)      +--------------------------+
|                        |  <-------------------> |                       | <-------------------> |                          |
|   React Native Frontend|                        |    Node.js Backend    |                        |   Python ML API (Flask)  |
|      (Expo Go)         |  1. User scans image   |      (Express)        |  2. Forwards image    |      (TensorFlow/Keras)  |
|                        |                        |                       |                       |                          |
|                        |  4. Receives result    |                       |  3. Returns prediction|                          |
+------------------------+  ------------------->  +-----------------------+  <------------------  +--------------------------+
                                                   |         |             |
                                                   |         | (Mongoose)  |
                                                   |         V             |
                                                   +-----------------------+
                                                   |                       |
                                                   |   MongoDB Database    |
                                                   | (Users, Waste, Stats) |
                                                   +-----------------------+
```

1.  **Frontend (`EcoEcho-frontend`)**: A cross-platform mobile app built with React Native and Expo. It handles all user interactions, captures images, and communicates exclusively with the backend API.
2.  **Backend (`EcoEcho-backend`)**: A Node.js/Express server that acts as the central hub. It manages user authentication, processes business logic, stores all user and waste data in a MongoDB database, and acts as a proxy for the ML service.
3.  **Machine Learning API (`waste-management-api`)**: A lightweight Python/Flask microservice. Its sole responsibility is to receive an image, process it using a trained TensorFlow/Keras MobileNetV2 model, and return the classification result to the backend (Please refer to https://github.com/ArunGarimella04/waste-management-api for the repository for the waate-management-api). 

<br>

## 🛠️ Technology Stack

| Component             | Technologies & Libraries                                                |
| --------------------- | ----------------------------------------------------------------------- |
| **Frontend**          | React Native, Expo, TypeScript, React Navigation, Axios, AsyncStorage   |
| **Backend**           | Node.js, Express.js, MongoDB, Mongoose, JWT, Bcrypt.js, dotenv          |
| **Machine Learning**  | Python, Flask, TensorFlow, Keras, Pillow                                |
| **Dev & Tooling**     | Git, npm, pip, Prettier                                                 |

<br>

## 🔌 API Endpoints Overview

### Backend API (`http://localhost:5000/api`)
- `POST /auth/register`: Create a new user account.
- `POST /auth/login`: Authenticate a user and receive a JWT.
- `GET /auth/me`: Get the current authenticated user's profile.
- `POST /waste/analyze`: The primary endpoint for sending an image (as form-data) for analysis.
- `GET /waste/history`: Retrieve the user's scan history.
- `GET /stats/me`: Fetch the current user's detailed statistics for the dashboard.

### Machine Learning API (`http://localhost:8000`)
- `POST /predict`: Accepts image data and returns a JSON object with the predicted class and confidence score.

<br>

## 🚀 Getting Started

Follow these instructions to get the entire application running on your local machine.

### Prerequisites

-   [Node.js](https://nodejs.org/) (v18 or later) & npm
-   [Python](https://www.python.org/) (v3.10 recommended) & pip
-   [Expo CLI](https://docs.expo.dev/get-started/installation/): `npm install -g expo-cli`
-   A running [MongoDB](https://www.mongodb.com/) instance (local or cloud).

### 1. Backend Setup (`EcoEcho-backend`)

```bash
# Navigate to the backend directory
cd "EcoEcho-backend"

# Create a .env file and add your configuration
# Example:
# MONGO_URI=mongodb://localhost:27017/ecoecho
# JWT_SECRET=a_very_strong_and_secret_key
# PORT=5000

# Install dependencies
npm install

# Start the server
npm start
```
> The backend API will be running at `http://localhost:5000`.

### 2. Machine Learning API Setup (`waste-management-api`)

```bash
# Navigate to the ML API directory
cd "waste-management-api"

# Install Python dependencies
pip install -r requirements.txt

# Start the Flask server
python main.py
```
> The ML service will be running at `http://localhost:8000`.

### 3. Frontend Setup (`EcoEcho-frontend`)

```bash
# Navigate to the frontend directory
cd "EcoEcho-frontend"

# Install dependencies
npm install

# IMPORTANT: Configure the API endpoint in src/services/api.js
# The API_URL must point to your computer's local network IP address.
# Find your IP with `ipconfig` (Windows) or `ifconfig` (macOS/Linux).
# Example: const API_URL = 'http://192.168.1.100:5000/api';

# Start the Expo development server
npx expo start
```
> Scan the QR code with the Expo Go app on your iOS or Android device to launch the app.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/ArunGarimella04/EcoEcho/issues).
