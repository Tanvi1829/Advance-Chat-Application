import jwt from "jsonwebtoken";
import { ENV } from "./env.js";

export const generateToken = (userId, res) => {
  const token = jwt.sign({ userId }, ENV.JWT_SECRET, { expiresIn: "7d" });
  
  // res.cookie("jwt", token, {
  //   httpOnly: true,
  //   secure: ENV.NODE_ENV === "production", // ✅ only send over HTTPS
  //   sameSite: ENV.NODE_ENV === "production" ? "none" : "lax", // ✅ for cross-site
  //   maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  // });
  // res.cookie("jwt", token, {
  //   maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  //   httpOnly: true, // XSS attacks prevent
  //   sameSite: "strict", // CSRF attacks prevent
  //   secure: ENV.NODE_ENV === "production", // HTTPS only in production
  // });

  res.cookie("jwt", token, {
  maxAge: 7 * 24 * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: ENV.NODE_ENV === "production" ? "none" : "strict", // Cross-domain
  secure: ENV.NODE_ENV === "production", // HTTPS required
});
  return token;
};
