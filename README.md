# UPSC Reading Planner

Free study time calculator for UPSC Mains aspirants. Add your books, set your reading speed, and get a realistic day-by-day study plan — saved to your account.

## Features
- Google login (data saved per user)
- Add / delete books and subjects per paper
- Live calculation of pages, hours, days
- Auto-saves to MongoDB every 1.5 seconds
- Print / Save as PDF
- Mobile responsive

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → Import → select this repo
3. Add these Environment Variables in Vercel dashboard:

| Key | Value |
|-----|-------|
| `NEXTAUTH_URL` | `https://your-app.vercel.app` |
| `NEXTAUTH_SECRET` | any random 32-char string |
| `GOOGLE_CLIENT_ID` | from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | from Google Cloud Console |
| `MONGODB_URI` | your MongoDB Atlas connection string |

4. Deploy!

## MongoDB Atlas Setup
- Create a free cluster at [mongodb.com/atlas](https://mongodb.com/atlas)
- Add a database user
- Whitelist all IPs: `0.0.0.0/0`
- Copy the connection string into `MONGODB_URI`
