const { TenantResolver } = require('./tenantResolver');

/**
 * Middleware that first validates the JWT via TenantResolver.fromJWT,
 * then checks the decoded role is 'superadmin'.
 * Returns 403 if not authorized.
 */
const superadminGuard = (req, res, next) => {
    TenantResolver.fromJWT(req, res, () => {
        const role = req.tenantContext?.role;
        if (role !== 'superadmin') {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Superadmin access required'
            });
        }
        next();
    });
};

module.exports = { superadminGuard };
