# My Portfolio

A modern, responsive portfolio website built with React. This portfolio includes sections for About, Skills, Projects, and Contact.

## Features

- ✨ Modern and clean UI design
- 📱 Fully responsive layout
- 🎨 Smooth scroll navigation
- 🔄 Active section highlighting
- 📝 Easy to customize content

## Quick Start

### Installation
```bash
npm install
```

### Development
```bash
npm start
```
Runs the app in development mode. Open [http://localhost:3000](http://localhost:3000) to view it.

## Customization Guide

### Edit Your Information

1. **About Section** (`src/components/About.js`):
   - Update your name, role, and description
   - Replace the image placeholder with your photo

2. **Skills Section** (`src/components/Skills.js`):
   - Modify the skill categories and add/remove skills as needed

3. **Projects Section** (`src/components/Projects.js`):
   - Update project titles, descriptions, and technologies
   - Add your project links (live demo and GitHub)

4. **Contact Section** (`src/components/Contact.js`):
   - Update your email, LinkedIn, and GitHub links
   - Configure form submission (currently logs to console)

### Styling

- Global styles: `src/App.css`
- Component-specific styles: Each component has its own CSS file in `src/components/`
- Color scheme: Edit CSS variables in `src/App.css` (--primary-color, --secondary-color, etc.)

### Project Structure

```
src/
├── App.js              # Main app component
├── App.css             # Global styles
├── components/
│   ├── Header.js       # Navigation header
│   ├── About.js        # About section
│   ├── Skills.js       # Skills section
│   ├── Projects.js     # Projects section
│   └── Contact.js      # Contact section
└── index.js            # Entry point
```

## Build for Production

```bash
npm run build
```

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

---

## AI Chat (/ask-me) – Setup

Add the following environment variables to a new `.env.local` file at the project root:

```
OPENAI_API_KEY=sk-...

# Email (choose one):
RESEND_API_KEY=...
EMAIL_FROM=Gireesh <no-reply@yourdomain.com>
# or SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=youruser
SMTP_PASS=yourpass
SMTP_SECURE=false

# Supabase (Service Role key is required server-side)
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
```

### Database

Create a table `otp` in Supabase:

```
create table if not exists otp (
  email text primary key,
  otp text not null,
  "expiresAt" timestamp with time zone not null,
  name text
);
```

Or if you already have the table, add the name column:

```
alter table public.otp
add column if not exists name text;
```

### Private chatbot transcript logs

Chat transcript persistence is temporarily disabled. `/api/chat` does not connect to MongoDB or write visitor messages, and the chat UI keeps messages only in React state while the page is open. Refreshing or leaving the page clears that in-memory history. MongoDB code and configuration are retained for a future re-integration; the MongoDB environment variables are not needed for chat responses during this period.

The SQL files under `supabase/migrations/` describe an earlier Supabase-based transcript logging design and are not active for chat transcripts. Supabase remains in use for OTP verification, resume requests, and approved public portfolio context for AI chat.

The OTP table is also accessed only by server routes using the Service Role key. Keep that key server-side; do not expose it through `NEXT_PUBLIC_*` variables or client code.

### Routes

- `/verify` – email/name input and OTP verification
- `/ask-me` – protected AI chat page (requires `verified_user` cookie)
- `/api/send-otp` – generates and emails OTP (5‑minute expiry)
- `/api/verify-otp` – verifies OTP and sets `verified_user` cookie (1 hour)
- `/api/chat` – sends messages to OpenAI with approved public portfolio records read from Supabase

Clicking "Insight AI" in the dock navigates to `/ask-me`.

### Chat AI and portfolio context

The active Next.js chat uses OpenAI for answer generation and reads only `visibility = 'public'` rows from `public.portfolio_data` in Supabase for portfolio context. Hugging Face and Pinecone are no longer part of the active chat flow, so no Pinecone embedding dimension is needed. The former Python AI backend and Pinecone ingestion scripts under `backend/` are retained as legacy files and are not called by the app.
