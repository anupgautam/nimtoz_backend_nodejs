import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { createProduct, deleteProductById, getAllProducts, getProductById, updateProduct } from '../../controllers/productController.js';
import { authenticateToken, authorizeRole } from '../../middleware/authentication.js';

const router = express.Router();


// Set up multer for multiple file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads/products';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

router.route('/')
    .get(getAllProducts)
    .post(authenticateToken, authorizeRole('ADMIN'), upload.array('product_image', 10), createProduct)

router.route('/:id')
    .get(getProductById)
    .put(authenticateToken, authorizeRole('ADMIN'), upload.array('product_image', 10), updateProduct)
    .delete(authenticateToken, authorizeRole('ADMIN'), deleteProductById)

export default router;