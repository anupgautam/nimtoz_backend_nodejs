import jwt from 'jsonwebtoken'

export const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(400).json({ message: "Missing Access Token" });

    jwt.verify(token, process.env.JWT_ACCESS_SECRET, (err, user) => {
        if (err) return res.status(401).json({ message: "Token Expired" })
        // if (err) return res.status(403).json({ message: "JWT Token sanga verify bhayena" })
        req.user = user;
        next();
    })

}

export const authorizeRole = (role) => {
    return (req, res, next) => {
        if (req.user.role !== role) return res.status(401).json({ message: "Unauthorized" });
        next();
    }
}

// export const authorizeRole = (roles) => {
//     return (req, res, next) => {
//         // Check if req.user.role exists and matches one of the allowed roles
//         console.log(roles, req.user.role)
//         if (!roles.includes(req.user.role)) {
//             return res.status(401).json({ message: "Unauthorized" });
//         }
//         next();
//     };
// };