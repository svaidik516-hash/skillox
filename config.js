/* =============================================
   SKILLOX — API Configuration
   ============================================= */

/*
 * HOW TO USE:
 * -----------
 * 1. For LOCAL development:  Leave API_BASE_URL as '' (empty string)
 *    → API calls go to the same server (localhost:3000)
 *
 * 2. For PRODUCTION (Vercel + ngrok):
 *    → Replace '' with your ngrok URL, e.g.:
 *      const API_BASE_URL = 'https://your-subdomain.ngrok-free.app';
 *
 *    → If you have a fixed ngrok domain, use that.
 *    → DO NOT include a trailing slash.
 */

const API_BASE_URL = '';
