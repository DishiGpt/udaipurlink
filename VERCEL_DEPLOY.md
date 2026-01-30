# Frontend Deployment Guide (Vercel)

This guide details how to deploy the UdaipurLink frontend to Vercel.

## Option 1: Using Vercel CLI (Recommended for "Command" approach)

This is the fastest method if you want to use your terminal.

1.  **Install Vercel CLI (if not installed)**
    ```bash
    npm i -g vercel
    ```

2.  **Login to Vercel**
    ```bash
    vercel login
    ```

3.  **Deploy**
    Run the following command in the root folder (`udaipurlink/`):
    ```bash
    vercel
    ```

4.  **Follow the Prompts**:
    -   **Set up and deploy?** [Y]
    -   **Which scope?** (Select your account)
    -   **Link to existing project?** [N]
    -   **Project Name**: `udaipurlink-frontend` (or similar)
    -   **In which directory is your code located?** `./` (Just press Enter)
    -   **Want to modify these settings?** [N] (Auto-detect usually works correctly for Vite)

5.  **Set Environment Variables**
    After the initial deployment (or during setup on the dashboard), you MUST set your environment variables for the app to work.
    
    You can do this via the command line:
    ```bash
    vercel env add VITE_GOOGLE_MAPS_API_KEY
    # Enter value from your .env file
    
    vercel env add VITE_API_URL
    # Enter your Render Backend URL (e.g., https://udaipurlink-backend.onrender.com)
    ```
    
    *Alternatively, go to the Vercel Dashboard -> Project Settings -> Environment Variables and add them there.*

6.  **Redeploy for Variables to take effect**
    ```bash
    vercel --prod
    ```

## Option 2: Using Vercel Dashboard (Git Integration)

1.  Push your latest code to GitHub (you already did this).
2.  Go to [Vercel Dashboard](https://vercel.com/new).
3.  Import your `udaipurlink` repository.
4.  **Framework Preset**: Vite (should be auto-detected).
5.  **Root Directory**: `./` (default).
6.  **Environment Variables**:
    -   `VITE_GOOGLE_MAPS_API_KEY`: (Your key)
    -   `VITE_API_URL`: (Your Render backend URL)
7.  Click **Deploy**.

## Critical Check

Ensure your `VITE_API_URL` does **not** have a trailing slash.
-   ✅ Correct: `https://backend.onrender.com`
-   ❌ Incorrect: `https://backend.onrender.com/`

## Build & Output Settings (If asked)

If Vercel does not auto-detect them, use these exact settings:

-   **Framework Preset**: `Vite`
-   **Build Command**: `npm run build`
-   **Output Directory**: `dist`
-   **Install Command**: `npm install`
