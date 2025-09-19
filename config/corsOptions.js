import { allowedOrigins } from './allowedOrigins.js';

const corsOptions = {
    origin: (origin, callback) => {
        const ngrokPattern = /https:\/\/[a-z0-9]+\.ngrok\.io/;

        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) {
            return callback(null, true);
        }

        // Normalize origin by removing trailing slashes
        const normalizedOrigin = origin.replace(/\/$/, '');

        if (allowedOrigins.includes(normalizedOrigin) || ngrokPattern.test(normalizedOrigin)) {
            callback(null, true);
        } else {
            console.error(`❌ CORS blocked: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
};

export default corsOptions;
