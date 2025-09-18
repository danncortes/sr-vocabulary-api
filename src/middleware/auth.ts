import { Request, Response, NextFunction } from 'express';

// Extend the Request interface to include the token
declare global {
    namespace Express {
        interface Request {
            token?: string;
        }
    }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const { authorization } = req.headers;
        const token: string = (authorization && authorization.startsWith('Bearer '))
            ? authorization.replace('Bearer ', '').trim()
            : '';

        if (!token) {
            res.status(401).json({ error: 'Unauthorized' });
            return; // Don't return the response object, just return void
        }

        // Add the token to the request object for use in handlers
        req.token = token;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
        return; // Don't return the response object, just return void
    }
};