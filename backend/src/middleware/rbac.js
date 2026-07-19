function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      console.warn(`[rbac] ${req.method} ${req.originalUrl} denied: authentication required`);
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const userRole = req.user.role;
    if (!allowedRoles.includes(userRole)) {
      console.warn(`[rbac] ${req.method} ${req.originalUrl} denied for role "${userRole}" (allowed: ${allowedRoles.join(', ')})`);
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource',
      });
    }

    next();
  };
}

export const requireAdmin = requireRoles('admin');
export const requireCashier = requireRoles('cashier', 'admin');
export const requireKitchen = requireRoles('kitchen', 'admin');
export const requireStudent = requireRoles('student');

export { requireRoles };
