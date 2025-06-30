# Student Lab Guide - Module 4: Conduct a Final Security Audit Using GHAS

Welcome to the hands-on lab for Module 4! In this lab, you'll learn how to conduct comprehensive security audits using GitHub Advanced Security.

## 🎯 Learning Objectives

By the end of this lab, you will be able to:
- ✅ Perform end-to-end security assessments across repositories
- ✅ Document security findings and mitigation strategies  
- ✅ Create executive-ready compliance reports
- ✅ Present security recommendations to leadership

## ⏱️ Estimated Time

- **Total Duration**: 90 minutes
- **Hands-on Time**: 60 minutes
- **Review Time**: 30 minutes

## 📋 Prerequisites

- GitHub account with access to create repositories
- Basic understanding of Git and GitHub
- Node.js 18+ installed locally
- Completed Modules 1-3 of the course

## 🧪 Lab Exercises

### Exercise 1: Fork and Setup (15 minutes)

1. **Fork the repository**
   - Navigate to the course repository
   - Click "Fork" to create your own copy
   - Clone to your local machine:
   ```bash
   git clone https://github.com/YOUR_USERNAME/ghas-audit-demo.git
   cd ghas-audit-demo
   ```

2. **Create a Personal Access Token**
   - Go to GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens
   - Click "Generate new token"
   - Set expiration to 30 days (for this lab)
   - Repository permissions:
     - Contents: Read
     - Metadata: Read
     - Security events: Read
   - Click "Generate token" and copy it

3. **Configure the environment**
   ```bash
   npm install
   npm run setup
   ```
   - Enter your PAT when prompted
   - Enter your GitHub username as the organization

4. **Verify setup**
   ```bash
   node src/audit.js --help
   ```

### Exercise 2: Enable GHAS Features (15 minutes)

1. **Enable security features on your fork**
   - Go to Settings → Code security and analysis
   - Enable:
     - ✅ Dependency graph
     - ✅ Dependabot alerts
     - ✅ Dependabot security updates
     - ✅ Code scanning (Set up → CodeQL)
     - ✅ Secret scanning

2. **Create the vulnerable sample app**
   ```bash
   cd samples/payment-api
   git init
   git add .
   git commit -m "Add vulnerable payment API"
   git remote add origin https://github.com/YOUR_USERNAME/payment-api.git
   git push -u origin main
   ```

3. **Wait for initial scans**
   - Go to the Security tab
   - Verify that scanning is running
   - Initial scans take 5-10 minutes

### Exercise 3: Run Your First Audit (20 minutes)

1. **Run audit locally**
   ```bash
   cd ../.. # Back to root directory
   npm run audit -- --org YOUR_USERNAME
   ```

2. **Review the output**
   - Note the total alerts found
   - Identify critical and high severity issues
   - Check compliance scores

3. **Generate executive dashboard**
   ```bash
   npm run dashboard
   ```
   - Open `reports/executive-dashboard.html` in your browser
   - Review the visualizations
   - Note the recommendations section

4. **Examine the JSON report**
   ```bash
   cat reports/audit-*.json | jq '.summary'
   ```

### Exercise 4: GitHub Actions Automation (15 minutes)

1. **Configure GitHub Actions**
   - Add secret to your fork:
     - Settings → Secrets and variables → Actions
     - New repository secret
     - Name: `GH_PAT_READ_ORG`
     - Value: Your PAT

2. **Update workflow file**
   - Edit `.github/workflows/ghas-audit.yml`
   - Replace `YOUR_ORG` with your username
   - Commit and push:
   ```bash
   git add .
   git commit -m "Configure audit workflow"
   git push
   ```

3. **Trigger the workflow**
   - Go to Actions tab
   - Select "GHAS Security Audit"
   - Click "Run workflow"
   - Select scope: "all"
   - Click "Run workflow" (green button)

4. **Monitor execution**
   - Watch the workflow progress
   - Download artifacts when complete
   - Review the created issue

### Exercise 5: Remediation Practice (15 minutes)

1. **Fix a secret scanning alert**
   - Go to your payment-api repository
   - Navigate to Security → Secret scanning
   - Click on an alert
   - Follow remediation steps:
   ```javascript
   // Replace hardcoded secret
   const JWT_SECRET = process.env.JWT_SECRET || 'default-dev-secret';
   ```

2. **Fix a dependency vulnerability**
   - Check Dependabot alerts
   - Find the lodash vulnerability
   - Update package.json:
   ```json
   "lodash": "^4.17.21"
   ```
   - Run `npm update lodash`
   - Commit and push

3. **Fix a code scanning alert**
   - Review code scanning alerts
   - Find the SQL injection
   - Fix the vulnerable code:
   ```javascript
   // Use parameterized query
   const query = 'SELECT * FROM users WHERE username = ?';
   db.get(query, [username], (err, user) => {
     // ... rest of code
   });
   ```

4. **Re-run the audit**
   - Trigger the workflow again
   - Compare results with initial audit
   - Note improvements in scores

### Exercise 6: Create Compliance Report (10 minutes)

1. **Generate compliance-focused report**
   ```bash
   node src/check-compliance.js \
     --audit-file reports/audit-*.json \
     --frameworks "OWASP,NIST"
   ```

2. **Create executive summary**
   - Use the dashboard data
   - Focus on:
     - Current risk level
     - Compliance gaps
     - Recommended actions
     - Timeline for remediation

3. **Present findings**
   - Prepare a 5-minute presentation
   - Cover:
     - Security posture overview
     - Critical findings
     - Compliance status
     - Remediation roadmap

## 🎯 Challenge Exercises

### Advanced Challenge 1: Custom Compliance Framework
- Add a new compliance framework (e.g., PCI-DSS)
- Update the scoring logic
- Generate a report with the new framework

### Advanced Challenge 2: Slack Integration
- Set up Slack webhook
- Configure notifications for critical alerts
- Test with a workflow run

### Advanced Challenge 3: Multi-Org Audit
- Modify the script to audit multiple organizations
- Aggregate results across organizations
- Create a consolidated dashboard

## ✅ Lab Checklist

Before considering the lab complete, ensure you have:

- [ ] Successfully forked and configured the repository
- [ ] Enabled all GHAS features
- [ ] Run at least one successful audit
- [ ] Generated an executive dashboard
- [ ] Fixed at least one vulnerability of each type
- [ ] Configured and run the GitHub Actions workflow
- [ ] Created a compliance report
- [ ] Downloaded and reviewed audit artifacts

## 🤔 Discussion Questions

1. **How would you prioritize remediation efforts based on the audit results?**
2. **What additional metrics would be valuable for your organization?**
3. **How can you ensure continuous compliance between audits?**
4. **What challenges might you face implementing this in a large organization?**

## 📚 Additional Resources

- [GitHub Advanced Security Documentation](https://docs.github.com/en/code-security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [Security Audit Best Practices](https://github.blog/2023-09-20-10-tips-for-a-successful-security-audit/)

## 🆘 Troubleshooting

### Common Issues

1. **"Token doesn't have required permissions"**
   - Ensure your PAT has `security_events:read` scope
   - For private repos, add `repo` scope

2. **"No alerts found"**
   - Wait for initial scans to complete (10-15 minutes)
   - Verify GHAS features are enabled
   - Check that repositories contain code

3. **"Workflow fails with permission error"**
   - Check that GH_PAT_READ_ORG secret is set correctly
   - Verify workflow permissions in settings

4. **"Dashboard generation fails"**
   - Ensure audit completed successfully first
   - Check that Node.js 18+ is installed
   - Verify all npm dependencies installed

### Getting Help

- Course discussion forum
- GitHub Discussions in the course repo
- Office hours (check course schedule)

## 🎉 Congratulations!

You've successfully completed the Module 4 lab! You now have hands-on experience with:
- Running comprehensive security audits
- Generating executive dashboards
- Automating security workflows
- Presenting security findings

### Next Steps
- Apply these techniques to your own repositories
- Customize the audit tool for your organization
- Share your experience with the community
- Complete the module quiz

---

**Remember**: Security is an ongoing process. Regular audits and continuous monitoring are key to maintaining a strong security posture!