# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a complete GitHub Advanced Security (GHAS) Audit Automation Template designed for:
- **Production Use**: Enterprise-grade security audit automation for organizations
- **Education**: Pluralsight Module 4 course material for GHAS compliance automation
- **Template**: Ready-to-fork solution for implementing security audits at scale

## Development Commands

### Setup and Installation
```bash
# Initial setup and configuration
npm install
npm run setup

# Run security audit
npm run audit

# Generate executive dashboard
npm run dashboard

# Check compliance against frameworks
node src/check-compliance.js --audit-file reports/audit-*.json --frameworks "OWASP,NIST,ISO27001"
```

### Local Development
```bash
# Lint code
npm run lint

# Format code
npm run format

# Run specific audit scope
node src/audit.js --org YOUR_ORG --scope critical

# Generate custom dashboard
node src/generate-dashboard.js --input reports/audit.json --output custom-dashboard.html
```

### GitHub Actions
- **Manual Trigger**: Use "Run workflow" in Actions tab
- **Scheduled**: Runs weekly on Mondays at 9 AM UTC
- **Artifacts**: Download reports from workflow runs

## Architecture & Structure

### Implemented Architecture
```
ghas-audit-demo/
├── .github/workflows/
│   ├── ghas-audit.yml           # Main comprehensive audit workflow
│   └── scheduled-audit.yml      # Daily quick security checks
├── src/
│   ├── audit.js                 # Core audit engine with CLI
│   ├── generate-dashboard.js    # Visual dashboard generator
│   ├── create-issue.js         # GitHub issue automation
│   └── check-compliance.js     # Compliance framework mapping
├── templates/
│   └── executive-dashboard.md   # Markdown report template
├── samples/payment-api/         # Intentionally vulnerable demo app
├── scripts/
│   └── setup.js                # Interactive setup wizard
├── docs/
│   ├── STUDENT_LAB_GUIDE.md    # 90-min hands-on lab
│   └── SECURITY_BEST_PRACTICES.md
└── reports/                     # Generated audit outputs
```

### Core Features

1. **Automated Security Audits**
   - Multi-repository scanning across organizations
   - Code scanning, secret scanning, and dependency analysis
   - Configurable audit scopes (all, critical, custom)

2. **Executive Dashboards**
   - Visual charts with severity distribution
   - Risk matrices and compliance scores
   - Actionable recommendations with priorities

3. **Compliance Mapping**
   - OWASP Top 10 2021 controls
   - NIST Cybersecurity Framework functions
   - ISO 27001:2022 requirements

4. **GitHub Integration**
   - Automated issue creation with findings
   - Workflow artifacts with downloadable reports
   - Slack notifications for critical alerts

### Key Implementation Notes

1. **Security Architecture**: Uses fine-grained PATs with minimal permissions (`security_events:read`)

2. **Compliance Frameworks**: Implements proven security control mappings with weighted scoring

3. **Educational Design**: Clear code structure with extensive documentation for learning

4. **Production Ready**: Enterprise-grade error handling, logging, and reporting

5. **Extensible**: Modular architecture allows easy customization for organization-specific needs

## Sample Vulnerable Application

The `samples/payment-api/` contains intentionally vulnerable Node.js code for demonstration:
- **SQL Injection**: Vulnerable login endpoint
- **Hardcoded Secrets**: JWT secrets and API keys
- **Dependency Vulnerabilities**: Outdated lodash version
- **Path Traversal**: Insecure file serving
- **Command Injection**: Unsafe user input handling

## Security Considerations

- **Token Management**: Never commit tokens; use GitHub Secrets
- **Permissions**: Follow principle of least privilege
- **Report Distribution**: Be mindful of sensitive findings in reports
- **Vulnerable Code**: Clearly marked and isolated in samples/ directory

## Reference Materials

- `/docs/STUDENT_LAB_GUIDE.md` - Complete 90-minute hands-on lab for Module 4
- `/docs/SECURITY_BEST_PRACTICES.md` - Enterprise implementation guidelines
- `/reference/` - Original PRD and course outline materials