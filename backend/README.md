# UdaipurLink Backend Deployment Guide

This guide details how to deploy the UdaipurLink backend to Render.

## Prerequisites

- A [Render](https://render.com) account.
- A MongoDB connection string (URI).

## Deployment Steps

1.  **Create a New Web Service**
    -   Log in to your Render dashboard.
    -   Click **New +** and select **Web Service**.
    -   Connect your GitHub repository containing this code.

2.  **Configure the Service**
    -   **Name**: Choose a name (e.g., `udaipurlink-backend`).
    -   **Root Directory**: `backend` (Important: This tells Render to look in the backend folder).
    -   **Environment**: `Node`.
    -   **Region**: Choose the one closest to your users.
    -   **Branch**: `main` (or your default branch).

3.  **Build & Start Commands**
    -   **Build Command**: `npm install`
    -   **Start Command**: `npm start`

4.  **Environment Variables**
    -   Scroll down to the "Environment Variables" section and add the following:
        -   **Key**: `MONGODB_URI`
        -   **Value**: `your_mongodb_connection_string` (e.g., `mongodb+srv://...`)
    
    *Note: Render automatically provides a `PORT` variable, and the application is configured to use it.*

5.  **Deploy**
    -   Click **Create Web Service**.
    -   Wait for the deployment to finish. You should see "MongoDB connected successfully" in the logs.

## Troubleshooting

-   **MongoDB Connection Error**: Double-check your `MONGODB_URI`. Ensure your IP address is whitelisted in MongoDB Atlas (allow access from anywhere `0.0.0.0/0` since Render IPs are dynamic).
-   **Port Issues**: The application listens on `process.env.PORT`. Do not hardcode the port.

## API Usage

Once deployed, your backend URL will be something like `https://udaipurlink-backend.onrender.com`.
Update your frontend `.env` file to point to this URL:

```
VITE_API_URL=https://your-app-name.onrender.com
```
