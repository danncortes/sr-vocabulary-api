import { Request, Response, NextFunction } from 'express';
import { getUserFromToken } from '../services/user.service.js'

// Extend the Request interface to include the token
declare global {
    namespace Express {
        interface Request {
            token?: string;
            user?: any;
        }
    }
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const tokenError = 'Invalid or missing token';

    try {
        const { authorization } = req.headers;
        const token: string = (authorization && authorization.startsWith('Bearer '))
            ? authorization.replace('Bearer ', '').trim()
            : '';

        if (!token) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        // Use user service to resolve the user and catch expiration
        const user = await getUserFromToken(token);

        // Attach token and user to the request for downstream handlers
        req.token = token;
        req.user = user;
        next();
    } catch (error: any) {
        const msg = (error?.message || '').toLowerCase();
        if (msg.includes('expired')) {
            res.status(401).json({ error: 'Unauthorized: token expired' });
            return;
        }
        res.status(401).json({ error: tokenError });
        return;
    }
};