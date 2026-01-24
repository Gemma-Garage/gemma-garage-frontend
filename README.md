# Gemma Garage Frontend

React web application for the Gemma Garage platform, providing a user interface for dataset management, model fine-tuning, and deployment.

## Overview

The frontend is a single-page application built with React 19 and Material-UI. It uses Firebase for authentication and Firestore for storing user projects and training history.

## Features

- User authentication (email/password)
- Project management dashboard
- Dataset upload and preview
- HuggingFace dataset import
- Training parameter configuration
- Real-time training progress with loss visualization
- Model download and HuggingFace upload

## Architecture

```
React App (Firebase Hosting)
      |
      +--> Firebase Auth (Authentication)
      +--> Firestore (Projects, Training History)
      +--> Backend API (Training, Datasets)
      +--> HuggingFace (OAuth, Model Upload)
```

## Project Structure

```
src/
  ├── components/       # Reusable UI components
  ├── pages/           # Page-level components
  ├── context/         # React Context (AuthContext)
  ├── utils/           # Utility functions
  ├── style/           # CSS files
  ├── firebase.js      # Firebase configuration
  └── api.js           # API base URLs
```

## Key Components

| Component | Purpose |
|-----------|---------|
| `AuthContext` | Manages authentication state |
| `ProjectDashboard` | Lists user projects with status |
| `ProjectPage` | Main fine-tuning interface |
| `DatasetUploadTabs` | File upload and HF import |
| `TrainingParameters` | Model, epochs, LR, LoRA rank |
| `LossGraph` | Training loss visualization |
| `HuggingFaceSettings` | OAuth connection management |

## Training Flow

1. User creates a project (supervised or RL)
2. Uploads dataset or imports from HuggingFace
3. Configures training parameters
4. Starts fine-tuning job
5. Frontend polls for training logs every 10 seconds
6. Loss graph updates in real-time
7. User downloads model or uploads to HuggingFace

## Local Development

```bash
# Install dependencies
npm install

# Set environment variables (create .env.local)
REACT_APP_FIREBASE_API_KEY=your_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project

# Start development server
npm start
```

## Deployment

Deployed to Firebase Hosting via the Firebase CLI:

```bash
npm run build
firebase deploy --only hosting
```

## Testing

```bash
npm test
```

## Tech Stack

- **Framework**: React 19
- **UI Library**: Material-UI 6
- **Routing**: React Router 7
- **Charts**: Chart.js / react-chartjs-2
- **Authentication**: Firebase Auth
- **Database**: Cloud Firestore
- **Hosting**: Firebase Hosting

## Environment Variables

| Variable | Description |
|----------|-------------|
| `REACT_APP_FIREBASE_API_KEY` | Firebase API key |
| `REACT_APP_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `REACT_APP_FIREBASE_PROJECT_ID` | Firebase project ID |
| `REACT_APP_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging ID |
| `REACT_APP_FIREBASE_APP_ID` | Firebase app ID |
