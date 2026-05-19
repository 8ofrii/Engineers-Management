import { ZodError } from 'zod';

const formatIssues = (error) => error.issues.map(issue => ({
    path: issue.path.join('.'),
    message: issue.message
}));

export const validate = (schemas) => (req, res, next) => {
    try {
        if (schemas.body) req.body = schemas.body.parse(req.body);
        if (schemas.params) req.params = schemas.params.parse(req.params);
        if (schemas.query) req.query = schemas.query.parse(req.query);
        next();
    } catch (err) {
        if (err instanceof ZodError) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: formatIssues(err)
            });
        }
        next(err);
    }
};
