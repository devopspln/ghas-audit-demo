# Tim's CliffNotes: GHAS Audit Demo

## What This Does
**Enterprise security audit automation** that scans GitHub repos for vulnerabilities and creates executive dashboards.

## For Instructors: Demo Setup

### Quick Start
```bash
git clone https://github.com/YOUR_USERNAME/ghas-audit-demo.git
cd ghas-audit-demo
npm install
npm run setup  # Configure with your GitHub token
```

### Demo Commands
```bash
# Run full audit (takes 2-3 minutes)
npm run audit

# Generate pretty dashboard
npm run dashboard

# Check compliance scores
node src/check-compliance.js --audit-file reports/audit-*.json --frameworks "OWASP,NIST"
```

### What You'll Show Students
1. **JSON Report**: `reports/audit-YYYY-MM-DD.json` - Raw security data
2. **Executive Dashboard**: `reports/executive-dashboard.html` - Visual charts and risk matrix
3. **GitHub Issues**: Auto-created issues for each finding
4. **Workflows**: Show the GitHub Actions tabs with scheduled runs

## For Students: Lab Instructions

### Prerequisites
- GitHub account with GHAS enabled repos
- Personal Access Token with `security_events:read` permission

### Lab Steps
```bash
# 1. Fork and clone
git clone https://github.com/YOUR_USERNAME/ghas-audit-demo.git
cd ghas-audit-demo

# 2. Install and setup
npm install
npm run setup  # Enter your GitHub org and token

# 3. Run audit on sample vulnerable app
node src/audit.js --repos "payment-api" --scope all

# 4. Generate dashboard
npm run dashboard

# 5. Check compliance
node src/check-compliance.js --audit-file reports/audit-*.json --frameworks "OWASP"
```

### Expected Outputs

#### 1. Audit Report (`reports/audit-*.json`)
```json
{
  "summary": {
    "totalRepositories": 1,
    "totalAlerts": 12,
    "criticalAlerts": 3,
    "secretAlerts": 2,
    "dependencyAlerts": 7
  }
}
```

#### 2. Executive Dashboard (`reports/executive-dashboard.html`)
- Risk score charts
- Alert severity pie charts  
- Compliance radar
- Repository security matrix

#### 3. GitHub Issues
Auto-created issues like:
- "Critical: SQL Injection vulnerability in payment-api"
- "High: Hardcoded secret detected in server.js"

### GitHub Actions Workflows

#### Manual Audit (`.github/workflows/ghas-audit.yml`)
- **Trigger**: Actions tab → "GHAS Audit" → "Run workflow"
- **Options**: Choose scope (all/critical/custom)
- **Artifacts**: Download reports after run completes

#### Scheduled Monitoring (`.github/workflows/scheduled-audit.yml`)  
- **Trigger**: Runs daily at 2 AM UTC
- **Purpose**: Monitor for new critical alerts
- **Output**: Issues created for urgent findings

## Key Learning Points

### For Students to Understand:
1. **Automation Value**: Manual security reviews don't scale
2. **Executive Communication**: Raw alerts vs. business risk dashboards  
3. **Compliance Mapping**: How vulnerabilities map to frameworks (OWASP, NIST)
4. **CI/CD Integration**: Security as part of development workflow

### Common Issues Students Hit:
- **Token Permissions**: Need `security_events:read` not just `repo`
- **GHAS Not Enabled**: Must enable code/secret scanning first
- **No Findings**: Sample app has intentional vulnerabilities to find
- **API Rate Limits**: Large orgs may hit GitHub API limits

## Quick Troubleshooting

```bash
# Check if GHAS is enabled
curl -H "Authorization: token $GH_PAT_READ_ORG" \
  https://api.github.com/repos/YOUR_ORG/YOUR_REPO

# Test audit on single repo
node src/audit.js --repos "payment-api" --scope critical

# Verify token permissions
node -e "console.log(process.env.GH_PAT_READ_ORG ? 'Token set' : 'Token missing')"
```

## Success Metrics for Lab
- ✅ Students generate audit report with findings
- ✅ Students view executive dashboard in browser  
- ✅ Students see GitHub issues created automatically
- ✅ Students understand compliance scoring (OWASP mapping)
- ✅ Students trigger workflow manually and download artifacts