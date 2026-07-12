const jwt = require('jsonwebtoken');

// FR2 User Authentication - verifies the session JWT.
// NFR4 (24h inactivity expiry) is implemented as a 24h token lifetime, since
// a stateless JWT has no server-side session to track idle time directly -
// each login/refresh issues a fresh 24h token.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Missing token' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { userId, email, role, isTutor }
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired session, please log in again' });
  }
}

// FR2.2 / NFR8 Role-Based Access Control
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action' });
    }
    next();
  };
}

function requireTutor(req, res, next) {
  if (!req.user || !req.user.isTutor) {
    return res.status(403).json({ message: 'This action requires a tutor account' });
  }
  next();
}

module.exports = { requireAuth, requireRole, requireTutor };
