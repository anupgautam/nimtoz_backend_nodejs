// const express = require('express');
// const morgan = require('morgan');
// const moment = require('moment');

import express from "express";
import moment from 'moment'
import morgan from "morgan";

const app = express();
app.set("trust proxy", "loopback, linklocal, uniquelocal");


// Define ANSI color codes for different status ranges
const statusColors = {
    1: '\x1b[35m', // Informational responses (1xx)
    2: '\x1b[32m', // Successful responses (2xx)
    3: '\x1b[36m', // Redirects (3xx)
    4: '\x1b[31m', // Client errors (4xx)
    5: '\x1b[33m', // Server errors (5xx)
};
const resetColor = '\x1b[0m';

let requestBodySize = 0;
app.use((req, res, next) => {
    // Reset the body size before each request
    requestBodySize = 0;

    // If the request is JSON or form-data, calculate the body size
    req.on('data', chunk => {
        requestBodySize += chunk.length;
    });

    req.on('end', () => {
        next();  // Proceed to next middleware or route handler
    });
});


// Custom logger middleware
export const customLogger = (req, res, next) => {
    // Define a custom log format function
    const customLogFormat = (tokens, req, res) => {
        const status = parseInt(tokens.status(req, res));

        // Determine the color based on the status code's first digit
        const statusCodeRange = Math.floor(status / 100);
        const statusColor = statusColors[statusCodeRange] || resetColor;

        // Get the original URL with query parameters
        const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

        const statusMessage = res.statusMessage || '';

        // Format the timestamp using moment
        const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');

        // Include the request size (Body size in bytes)
        const requestSize = requestBodySize || 'unknown';

        // Get the response size (from Content-Length header)
        const responseSize = res.get('Content-Length') || 'unknown';

        // Get the client IP address
        const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
        // const clientIp = req.connection.remoteAddress || 'unknown';

        // Format the log entry
        // const logEntry = `${statusColor} ${timestamp} ${clientIp} ${tokens.method(req, res)} ${fullUrl} - ${tokens.status(req, res)} : ${statusMessage} ${tokens['response-time'](req, res)}ms${resetColor} - Res: ${responseSize} Req: ${requestSize}`;
        const logEntry = `${statusColor} ${timestamp} ${tokens.method(req, res)} ${fullUrl} - ${tokens.status(req, res)} : ${statusMessage} ${tokens['response-time'](req, res)}ms${resetColor} - Res: ${responseSize} bytes Req: ${requestSize} bytes`;

        return logEntry;
    };

    // Use Morgan middleware with the custom log format
    morgan(customLogFormat)(req, res, next);
};



