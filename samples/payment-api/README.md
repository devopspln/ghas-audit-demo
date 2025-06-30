# Payment API - Vulnerable Sample Application

⚠️ **WARNING: This application contains intentional security vulnerabilities for educational purposes. DO NOT deploy to production!**

## Purpose

This sample application is designed to demonstrate how GitHub Advanced Security (GHAS) detects various security vulnerabilities. It's part of the Pluralsight course on GHAS compliance automation.

## Vulnerabilities Included

### 1. **Secret Scanning Alerts**
- Hardcoded JWT secret
- Exposed API key
- Sensitive data in logs

### 2. **Code Scanning Alerts**
- SQL injection in login endpoint
- Command injection vulnerability
- Directory traversal in file serving
- Missing authentication checks
- XXE (XML External Entity) vulnerability

### 3. **Dependency Vulnerabilities**
- Outdated lodash version (4.17.4) with known vulnerabilities
- Prototype pollution vulnerability

### 4. **Security Misconfigurations**
- No input validation
- Weak authentication implementation
- Exposed admin endpoints
- Insecure XML parsing

## Running the Application

```bash
# Install dependencies
npm install

# Start the server
npm start

# Or use nodemon for development
npm run dev
```

## API Endpoints

- `POST /api/login` - User login (SQL injection vulnerable)
- `GET /api/users/:id/balance` - Check user balance (no auth required)
- `POST /api/transfer` - Transfer funds
- `GET /api/reports/:filename` - Download reports (path traversal)
- `POST /api/settings` - Update settings (prototype pollution)
- `GET /api/admin/users` - List all users (no auth)
- `POST /api/import` - Import XML data (XXE vulnerable)

## Expected GHAS Findings

When GHAS scans this repository, it should detect:

1. **High/Critical Code Scanning Alerts**
   - CWE-89: SQL Injection
   - CWE-22: Path Traversal
   - CWE-611: XXE
   - CWE-1321: Prototype Pollution

2. **Secret Scanning Alerts**
   - Generic API Key
   - Generic Secret

3. **Dependabot Alerts**
   - lodash < 4.17.11 (multiple CVEs)

## Learning Objectives

Students will learn to:
- Identify common vulnerability patterns
- Understand how GHAS detects security issues
- Practice remediation techniques
- Configure security policies

## Remediation Guide

For the course lab, students should:
1. Fork this repository
2. Enable GHAS features
3. Review detected vulnerabilities
4. Create pull requests with fixes
5. Observe how GHAS validates remediation

## Note

This is intentionally vulnerable code created for educational purposes as part of the GHAS audit demonstration. In real applications:
- Never hardcode secrets
- Always validate and sanitize user input
- Implement proper authentication and authorization
- Keep dependencies up to date
- Follow security best practices