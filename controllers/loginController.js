import bcrypt from 'bcryptjs'
import { generateAccesstoken, generateRefreshToken } from "../auth/generateTokens.js";
import { loginSchema } from '../utils/validationSchema.js';
import { z } from 'zod'

import { prisma } from '../config/prisma.js'


const loginUser = async (req, res) => {
    let validatedData;
    try {
      validatedData = loginSchema.parse(req.body);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ success: false, errors: err.errors });
      }
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  
    const { email, phone_number, password } = validatedData;
  
    // Find user by email OR phone
    const foundUser = await prisma.user.findFirst({
      where: {
        OR: [
          email ? { email } : {},
          phone_number ? { phone_number } : {}
        ]
      }
    });
  
    if (!foundUser) return res.status(404).json("User Not Found");
  
    const validPassword = bcrypt.compareSync(password, foundUser.password);
    if (!validPassword) return res.status(401).json('Invalid credentials');
  
    const accessToken = generateAccesstoken(foundUser);
    const refreshToken = generateRefreshToken(foundUser);
  
    const updatedUser = await prisma.user.update({
      where: { id: foundUser.id },
      data: { refreshToken }
    });
  
    return res.json({
      success: true,
      accessToken,
      refreshToken,
      user: updatedUser
    });
  };
  

export {
    loginUser
}