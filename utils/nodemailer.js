// lib/nodemailer.ts
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: 'your_smtp_host', // e.g., smtp.gmail.com
    port: 587, // or 465 for secure
    secure: false, // true for 465, false for other ports
    auth: {
        user: 'your_email@example.com', // Your email
        pass: 'your_email_password', // Your email password
    },
});

export const sendMail = async (to, subject, text) => {
    try {
        await transporter.sendMail({
            from: '"Your Name" <your_email@example.com>', // sender address
            to, // recipient email
            subject, // Subject line
            text, // plain text body
        });
    } catch (error) {
        console.error('Error sending email:', error);
        throw error; // Rethrow error to handle it in the calling function if needed
    }
};
