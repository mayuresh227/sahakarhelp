# Security Hardening for SahakarHelp

This document outlines the security measures implemented in the SahakarHelp platform (Express backend, MongoDB, Next.js frontend) to ensure production‑grade security.

## 1. Installed Security Packages

The following npm packages have been added to the backend:

- **helmet** – Sets secure HTTP headers
- **express‑rate‑limit** – Limits repeated requests to public APIs
- **xss‑clean** – Sanitizes user input to prevent XSS attacks
- **express‑mongo‑sanitize** – Prevents NoSQL injection
- **express‑validator** – Validates and sanitizes request data
- **cookie‑parser** – Parses cookies for HTTP‑only authentication
- **multer** – Secure file upload handling with validation

## 2. Applied Middleware

### Security Headers (Helmet)
Helmet is configured with default settings, which include:
- `Content‑Security‑Policy`
- `X‑Frame‑Options: DENY`
- `X‑Content‑Type‑Options: nosniff`
- `Referrer‑Policy: strict‑origin‑when‑cross‑origin`
- `Strict‑Transport‑Security` (enabled in production)

### Rate Limiting
- Global limit: **100 requests per 15 minutes per IP**
- Authentication endpoints have a stricter limit (5 requests per 15 minutes)
- Custom error message returned when limit is exceeded

### CORS Configuration
- Only the frontend domain (configurable via `FRONTEND_URL` environment variable) is allowed.
- Credentials (cookies, authorization headers) are enabled.
- Defaults to `http://localhost:3000` in development.

### Input Sanitization
- **xss‑clean** strips HTML/JS from user‑supplied data.
- **express‑mongo‑sanitize** removes MongoDB operators (`$`, `.`) from request body, query, and params.

### NoSQL Injection Prevention
- All user input is sanitized before being passed to MongoDB queries.
- Mongoose schema validation provides an additional layer.

## 3. Input Validation

- **express‑validator** middleware validates all incoming request data.
- Validation rules are defined per route (see `backend/middleware/validation.js`).
- Invalid requests receive a detailed 400 response with field‑level errors.

## 4. Authentication Security

### JWT Tokens
- Tokens are verified using `NEXTAUTH_SECRET` (must match frontend).
- Tokens are extracted from:
  1. `Authorization: Bearer <token>` header
  2. HTTP‑only cookies (`next‑auth.session‑token` or `__Secure‑next‑auth.session‑token`)
- Token expiry is enforced by `jsonwebtoken` verification.

### HTTP‑Only Cookies
- The backend supports cookie‑based authentication (for enhanced security).
- Cookies are parsed with `cookie‑parser` middleware.
- In production, ensure `SECURE_COOKIES=true` and `sameSite` policies are set.

### Role‑Based Access Control (RBAC)
- Middleware `requireRole` and `requirePlan` enforce granular permissions.
- User roles: `user`, `admin`, `superadmin`.
- Plan‑based restrictions for free vs. pro users.

## 5. File Upload Security

- Maximum file size: **10 MB** (configurable via `MAX_FILE_SIZE_MB`).
- Allowed MIME types: images (JPEG, PNG, WebP, GIF), PDF, plain text, Office documents, ZIP.
- File type detection via magic bytes (for base64 uploads) and extension validation.
- Malicious file scanning (basic) is implemented; consider integrating ClamAV or VirusTotal in production.

See `backend/middleware/fileUploadSecurity.js` for implementation.

## 6. Error Handling

- Stack traces are **never exposed in production**.
- 4xx client errors return a safe, user‑friendly message.
- 5xx server errors return a generic “Internal server error” in production.
- All errors are logged internally (with stack traces) for debugging.

## 7. Environment Security

- Sensitive configuration is stored in environment variables (`.env`).
- `.env` is excluded from version control (see `.gitignore`).
- A template (`.env.example`) is provided with placeholder values.
- Secrets are never hard‑coded or logged.

## 8. Bonus Security Features

### Request Logging
- Every request is logged with method, path, IP, user agent, response time, and status.
- Logs are output to console; integrate with Winston/ELK in production.

### Brute‑Force Protection
- In‑memory tracking of failed authentication attempts (max 5 per IP).
- IPs that exceed the limit are blocked for **15 minutes**.
- Reset on successful authentication.

### IP Blocklist
- Static list of known malicious IPs (expand with threat intelligence feeds).
- Blocked IPs receive a 403 response.

### Monitoring & Alerting
- All API errors are tracked in the `Analytics` collection.
- Consider integrating with Sentry, New Relic, or Datadog.

## 9. Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong, randomly generated secrets (≥32 characters)
- [ ] Enable HTTPS (TLS) on the server
- [ ] Set `SECURE_COOKIES=true` and `HSTS_ENABLED=true`
- [ ] Configure a reverse proxy (Nginx/Apache) with additional security headers
- [ ] Regularly update dependencies (`npm audit`, `npm update`)
- [ ] Use a managed MongoDB service with encryption at rest
- [ ] Implement a Web Application Firewall (WAF)
- [ ] Schedule periodic security scans (OWASP ZAP, npm audit)
- [ ] Set up automated backups and disaster recovery

## 10. Incident Response

- Monitor logs for unusual patterns (e.g., spike in 4xx/5xx errors).
- Have a rollback plan for deployments.
- Keep contact details of security team members.
- Report vulnerabilities via a dedicated channel.

## 11. References

- [OWASP Top Ten](https://owasp.org/www-project-top-ten/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [MongoDB Security Checklist](https://www.mongodb.com/docs/manual/security/)
- [Helmet.js Documentation](https://helmetjs.github.io/)

---

*This document is a living guide. Update it as the threat landscape evolves and new security measures are adopted.*