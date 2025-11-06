# Troubleshooting 404 Error

## Quick Fix Steps:

1. **Stop all running servers:**
   - Press `Ctrl+C` in any terminal windows running npm/node
   - Or close all terminal windows

2. **Clear cache and restart:**
   ```bash
   npm start
   ```
   Wait for the server to start. You should see:
   ```
   Compiled successfully!
   You can now view my-portfolio in the browser.
   Local:            http://localhost:3000
   ```

3. **Access the correct URL:**
   - Open your browser
   - Go to: **http://localhost:3000**
   - NOT http://localhost:3000/projects (that will give 404)
   - The app uses client-side routing, so all routes start from /

4. **If still getting 404:**
   - Make sure you're accessing `http://localhost:3000` (not 3001 or other ports)
   - Check the terminal output - it will tell you which port the app is running on
   - Try clearing browser cache: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

## Common Issues:

- **Wrong Port**: React app runs on port 3000 by default
- **Wrong URL**: Make sure you're accessing `http://localhost:3000` not `/projects` directly
- **Server Not Running**: Check terminal for compilation errors
- **Browser Cache**: Hard refresh the page

## Navigation in the App:

- Click **"View Projects"** button on main page → navigates to projects page
- Click **Project icon** in dock → navigates to projects page  
- Click **"Back"** button on projects page → returns to home

All navigation happens client-side, so you'll always be on `http://localhost:3000` but the content changes.

