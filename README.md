# File Management System with PIN Authentication

A modern file management system built with React, Tailwind CSS, and Node.js. Users can create a PIN to access their personal file storage without needing to sign up.

## Features

- **PIN-based Authentication**: No signup required - just create a PIN to access your files
- **File Upload**: Upload folders or ZIP files
- **File Management**: View, download, and delete your files
- **User Isolation**: Each PIN has its own isolated file storage
- **Modern UI**: Built with React and Tailwind CSS

## Prerequisites

- Node.js 14+ and npm

## Installation

1. Clone or navigate to the project directory
2. Install dependencies:
   ```bash
   npm install
   ```

## Development

### Option 1: Production Build (Recommended for production)

1. Build the React app with Tailwind CSS:
   ```bash
   npm run build
   ```

2. Start the server:
   ```bash
   npm start
   ```

3. Open your browser and visit `http://localhost:3000`

### Option 2: React Development Server (For frontend development)

1. In one terminal, start the React dev server:
   ```bash
   npm run dev:react
   ```
   This will start the React app on `http://localhost:3000` (or another port if 3000 is taken)

2. In another terminal, start the backend server on a different port:
   ```bash
   PORT=3001 npm start
   ```
   The backend will run on port 3001

   **Note**: You'll need to update the API endpoints in the React components to point to `http://localhost:3001` or configure a proxy in `package.json`.

## Usage

1. **Create a PIN**: 
   - When you first visit the app, click "Don't have a PIN? Create one"
   - Enter a PIN (minimum 4 characters) and confirm it
   - Click "Create PIN"

2. **Access Your Files**:
   - Enter your PIN and click "Access Files"
   - You'll be taken to your file management dashboard

3. **Upload Files**:
   - Click "Select Folder" to upload an entire folder
   - Or click "Select Zip File" to upload a ZIP file
   - Files will be uploaded to your personal storage

4. **Manage Files**:
   - View all your uploaded files
   - Download individual files or folders (folders are downloaded as ZIP)
   - Delete files or folders you no longer need

5. **Logout**:
   - Click the "Logout" button to return to the PIN entry screen

## Project Structure

```
.
├── src/
│   ├── components/
│   │   ├── PinScreen.js      # PIN entry/creation component
│   │   └── FileManager.js    # File management interface
│   ├── App.js                 # Main React component
│   ├── index.js               # React entry point
│   └── input.css              # Tailwind CSS imports
├── public/
│   └── index.html             # HTML template
├── server.js                  # Express backend server
├── package.json               # Dependencies and scripts
├── tailwind.config.js         # Tailwind configuration
└── README.md                  # This file
```

## API Endpoints

- `POST /api/pin/create` - Create a new PIN
- `POST /api/pin/verify` - Verify a PIN
- `POST /api/upload` - Upload files (requires PIN)
- `GET /api/files?pin=xxx` - List files for a PIN
- `GET /api/download?path=xxx&pin=xxx` - Download a file or folder
- `DELETE /api/delete?path=xxx&pin=xxx` - Delete a file or folder

## Security Notes

- PINs are hashed using SHA-256 before storage
- Each user's files are stored in separate directories based on their PIN hash
- Path traversal attacks are prevented
- This is a demo application - for production use, consider additional security measures

## Notes

- Files are stored in the `uploads/` directory
- PINs are stored in `pins.json` (hashed)
- The `uploads/` and `pins.json` directories/files are gitignored
