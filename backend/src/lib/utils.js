import jwt from "jsonwebtoken";
import { ENV } from "./env.js";

export const generateToken = (userId, res) => {
  const token = jwt.sign({ id: userId }, ENV.JWT_SECRET, { expiresIn: "1d" });

  // Set cookie properly for cross-origin (Netlify frontend → Render backend)
  res.cookie("jwt", token, {
    httpOnly: true,          // prevents JS access
    secure: true,            // must be true on HTTPS
    sameSite: "None",        // allows cross-origin requests
    maxAge: 1000 * 60 * 60 * 24, // 1 day
  });
};
