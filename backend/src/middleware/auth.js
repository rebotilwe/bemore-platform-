export default function auth(req, res, next) {
  console.log('AUTH RUNNING - url:', req.originalUrl);
  return next();
}
export function csrfProtection(req, res, next) {
  console.log('CSRF RUNNING - url:', req.originalUrl);
  return next();
}
