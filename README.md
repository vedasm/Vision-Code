# Vision Code

An AI-powered DevTool that visualizes code execution logic, data structures, and algorithmic complexity in real-time using AST analysis.

## Features
- Step-by-step code visualization.
- Supports Python, JavaScript, and Java.
- Real-time analysis of time and space complexity.
- Interactive graph representation using D3.js.

## Local Development

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory and add your Google Gemini API Key:
   ```env
   API_KEY=your_actual_api_key_here
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

## Vercel Deployment

To deploy this project to Vercel, follow these steps:

1. **Connect to Vercel**: Import your repository into Vercel.
2. **Environment Variables**: In the Vercel project settings, add the following environment variable:
   - `API_KEY`: Your Google Gemini API Key.
3. **Build Settings**:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
4. **Deploy**: Click the deploy button.

### SPA Routing
This project uses a `vercel.json` file to handle SPA routing, ensuring that all routes are redirected to `index.html`.
