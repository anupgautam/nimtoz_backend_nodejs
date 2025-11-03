import dotenv from 'dotenv';
dotenv.config();

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import os from "os";



import { customLogger } from "./middleware/morganLogger.js";
import corsOptions from "./config/corsOptions.js";
import { globalErrorHandler } from "./middleware/globalErrorHandler.js";

//! Routes
import category from "./routes/api/category.js";
import contact from "./routes/api/contact.js";
import business from "./routes/api/business.js";
import location from "./routes/api/location.js";
import blog from "./routes/api/blog.js";
import user from "./routes/api/user.js";
import login from "./routes/api/login.js";
import refresh from "./routes/api/refresh.js";
import product from "./routes/api/product.js";
import booking from "./routes/api/booking.js";
import productRating from "./routes/api/productRatings.js";
import eventType from "./routes/api/eventType.js";
import forgotPassword from "./routes/api/forgotPassword.js";
import resetPassword from "./routes/api/resetPassword.js";
import stats from "./routes/api/statistics.js";

//! Controllers (direct endpoints)
import { countCategory, getCategoryByProductId } from "./controllers/categoriesController.js";
import { getTopBookers } from "./controllers/registerController.js";
import { getBookingStats } from "./controllers/bookingController.js";
import {
  getBookingProducts,
  getBookingProductsById,
  getHomePageProducts,
  getProductImagesById,
  updateProduct,
} from "./controllers/productController.js";
import { getStatBlogs } from "./controllers/blogController.js";
import { verifyOTP } from "./controllers/verifyOTPController.js";

const app = express();
const PORT = process.env.PORT || 1000;

//! Middleware
app.use(
  cors({
    origin: [
      "*",
      "http://localhost:3000",
    ],
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use("/uploads", express.static("uploads"));
app.use(express.urlencoded({ extended: false, limit: "70mb" }));
app.use(express.json({ limit: "70mb" }));
app.use(cookieParser());
app.use(customLogger);

//! Routes
app.use("/product/rating", productRating);
app.use("/category", category);
app.use("/count_category", countCategory);
app.use("/topbookers", getTopBookers);
app.use("/contact", contact);
app.use("/business", business);
app.use("/location", location);
app.use("/blog", blog);
app.use("/user", user);
app.use("/product", product);
app.use("/bookingproducts", getBookingProducts);
app.use("/bookingproduct/:id", getBookingProductsById);
app.use("/booking", booking);
app.use("/eventtype", eventType);
app.use("/login", login);
app.use("/refresh_token", refresh);
app.use("/forgot-password", forgotPassword);
app.use("/reset-password", resetPassword);
app.use("/verify-otp", verifyOTP);
app.use("/stats", stats);
app.use("/homepageproducts", getHomePageProducts);
app.use("/bookingstats", getBookingStats);
app.use("/productimages/:id", getProductImagesById);
app.use("/productcategoryid/:id", getCategoryByProductId);
app.use("/product/:id", updateProduct);
app.use("/stat-blogs", getStatBlogs);

//! Base route (homepage showing all endpoints)
app.get("/", (req, res) => {
  const routes = [
    { path: "/category", desc: "Manage categories" },
    { path: "/count_category", desc: "Count categories" },
    { path: "/topbookers", desc: "Top booking users" },
    { path: "/contact", desc: "Contact form routes" },
    { path: "/business", desc: "Business-related APIs" },
    { path: "/location", desc: "Manage locations" },
    { path: "/blog", desc: "Blog routes" },
    { path: "/user", desc: "User management" },
    { path: "/product", desc: "Product APIs" },
    { path: "/booking", desc: "Bookings" },
    { path: "/eventtype", desc: "Event types" },
    { path: "/product/rating", desc: "Product reviews and ratings" },
    { path: "/login", desc: "Login route" },
    { path: "/refresh_token", desc: "Token refresh" },
    { path: "/forgot-password", desc: "Forgot password" },
    { path: "/reset-password", desc: "Reset password" },
    { path: "/verify-otp", desc: "Verify OTP" },
    { path: "/stats", desc: "Statistics" },
    { path: "/homepageproducts", desc: "Homepage featured products" },
    { path: "/bookingstats", desc: "Booking statistics" },
    { path: "/stat-blogs", desc: "Blog statistics" },
  ];

  let html = `
    <h1 style="font-family: Arial; color: #333;">🚀 Nimtoz Backend API</h1>
    <p style="font-family: Arial;">Server is running successfully.</p>
    <h2 style="font-family: Arial;">Available API Endpoints:</h2>
    <ul style="font-family: Arial; line-height: 1.7;">
      ${routes
        .map(
          (r) =>
            `<li><b><a href="${r.path}" target="_blank">${r.path}</a></b> — ${r.desc}</li>`
        )
        .join("")}
    </ul>
    <hr>
    <p style="font-family: Arial; color: gray;">Last updated: ${new Date().toLocaleString()}</p>
  `;

  res.status(200).send(html);
});

//! Prevent favicon 404 logs
app.get("/favicon.ico", (req, res) => res.status(204));

//! 404 handler for unknown routes
app.get("*", (req, res, next) => {
  const err = new Error(`${req.originalUrl} doesn't exist`);
  err.statusCode = 404;
  err.status = "fail";
  next(err);
});

//! Global error handler
app.use(globalErrorHandler);

//! Detect local & LAN IPs
const ip = "0.0.0.0";
const networkInterfaces = os.networkInterfaces();
const localIP =
  Object.values(networkInterfaces)
    .flat()
    .find((iface) => iface.family === "IPv4" && !iface.internal)?.address || "localhost";

//! Start server
app.listen(PORT, ip, () => {
  console.log(`✅ Server running locally at:  http://localhost:${PORT}`);
  console.log(`🌐 Accessible on LAN at:     http://${localIP}:${PORT}`);
});
