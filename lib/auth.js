// lib/auth.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { prisma } = require('./prisma');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

async function verifyLogin(username, password) {
  const admin = await prisma.admin.findUnique({ where: { username } });
  if (!admin) return null;
  const valid = await bcrypt.compare(password, admin.password);
  if (!valid) return null;
  const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, {
    expiresIn: '7d',
  });
  return token;
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function getTokenFromRequest(req) {
  const cookie = req.headers.get?.('cookie') || req.headers?.cookie || '';
  const match = cookie.match(/admin_token=([^;]+)/);
  return match ? match[1] : null;
}

function requireAuth(req) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  return verifyToken(token);
}

module.exports = { verifyLogin, verifyToken, requireAuth, getTokenFromRequest };
