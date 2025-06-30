#!/usr/bin/env node

import { Octokit } from '@octokit/rest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Command } from 'commander';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

program
  .name('create-issue')
  .description('Create a GitHub issue with audit findings')
  .version('1.0.0')
  .requiredOption('--audit-file <file>', 'Audit results JSON file')
  .option('--dashboard <file>', 'Dashboard HTML file')
  .option('--repo <repo>', 'Repository to create issue in', process.env.GITHUB_REPOSITORY)
  .option('--token <token>', 'GitHub token', process.env.GITHUB_TOKEN || process.env.GH_TOKEN)
  .parse();

const options = program.opts();

async function createIssue() {
  try {
    // Parse repository owner/name
    const [owner, repo] = options.repo.split('/');
    
    if (!owner || !repo) {
      throw new Error('Invalid repository format. Use owner/repo');
    }
    
    // Initialize Octokit
    const octokit = new Octokit({
      auth: options.token,
    });
    
    // Read audit results
    const auditResults = JSON.parse(await fs.readFile(options.auditFile, 'utf8'));
    
    // Generate issue content
    const issueBody = generateIssueBody(auditResults);
    
    // Create issue
    const { data: issue } = await octokit.issues.create({
      owner,
      repo,
      title: `🔒 Security Audit Results - ${new Date().toLocaleDateString()}`,
      body: issueBody,
      labels: ['security', 'audit', 'ghas'],
    });
    
    console.log(chalk.green(`✅ Issue created: ${issue.html_url}`));
    
    // Add dashboard as comment if provided
    if (options.dashboard) {
      const dashboardContent = await fs.readFile(options.dashboard, 'utf8');
      const dashboardComment = `## 📊 Executive Dashboard\n\n<details>\n<summary>View Full Dashboard</summary>\n\n${extractDashboardSummary(dashboardContent)}\n\n[Download Full Dashboard](${issue.html_url})\n</details>`;
      
      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: issue.number,
        body: dashboardComment,
      });
    }
    
  } catch (error) {
    console.error(chalk.red('Error creating issue:'), error.message);
    process.exit(1);
  }
}

function generateIssueBody(auditResults) {
  const { metadata, summary, compliance, repositories } = auditResults;
  
  let body = `## 🔍 Security Audit Summary

**Organization:** ${metadata.organization}
**Audit Date:** ${new Date(metadata.auditDate).toLocaleString()}
**Scope:** ${metadata.scope}

### 📊 Key Metrics

| Metric | Value |
|--------|-------|
| Total Repositories | ${summary.totalRepositories} |
| Scanned Repositories | ${summary.scannedRepositories} |
| **Total Alerts** | **${summary.totalAlerts}** |
| 🔴 Critical Alerts | ${summary.criticalAlerts} |
| 🟠 High Alerts | ${summary.highAlerts} |
| 🟡 Medium Alerts | ${summary.mediumAlerts} |
| 🟢 Low Alerts | ${summary.lowAlerts} |

### 🎯 Alert Distribution

- **Code Scanning:** ${summary.codeAlerts} alerts
- **Secret Scanning:** ${summary.secretAlerts} alerts
- **Dependencies:** ${summary.dependencyAlerts} alerts

### ✅ Compliance Scores

| Framework | Score |
|-----------|-------|
| Overall | ${compliance.overallScore.toFixed(1)}% |
`;

  // Add framework scores
  Object.entries(compliance.frameworks).forEach(([framework, data]) => {
    body += `| ${framework} | ${data.score.toFixed(1)}% |\n`;
  });

  // Add high-risk repositories
  const highRiskRepos = repositories
    .filter(repo => repo.metrics.totalAlerts > 10 || 
      repo.alerts.code.some(a => a.severity === 'critical') ||
      repo.alerts.dependency.some(a => a.severity === 'CRITICAL'))
    .sort((a, b) => b.metrics.totalAlerts - a.metrics.totalAlerts)
    .slice(0, 5);

  if (highRiskRepos.length > 0) {
    body += `\n### 🚨 High-Risk Repositories\n\n`;
    body += `| Repository | Total Alerts | Critical/High |\n`;
    body += `|------------|--------------|---------------|\n`;
    
    highRiskRepos.forEach(repo => {
      const criticalHigh = repo.alerts.code.filter(a => 
        a.severity === 'critical' || a.severity === 'high'
      ).length + repo.alerts.dependency.filter(a => 
        a.severity === 'CRITICAL' || a.severity === 'HIGH'
      ).length;
      
      body += `| [${repo.name}](${repo.url}) | ${repo.metrics.totalAlerts} | ${criticalHigh} |\n`;
    });
  }

  // Add recommendations
  body += `\n### 📋 Key Recommendations\n\n`;
  
  if (summary.criticalAlerts > 0) {
    body += `1. **🔴 Address Critical Alerts Immediately**\n   - ${summary.criticalAlerts} critical security vulnerabilities require immediate attention\n   - Focus on repositories with production deployments first\n\n`;
  }
  
  const unprotectedRepos = repositories.filter(repo => 
    !repo.securityFeatures.codeScanning.enabled ||
    !repo.securityFeatures.secretScanning.enabled ||
    !repo.securityFeatures.dependabot.enabled
  ).length;
  
  if (unprotectedRepos > 0) {
    body += `2. **🛡️ Enable Security Features**\n   - ${unprotectedRepos} repositories lack complete security scanning\n   - Enable all GHAS features for comprehensive protection\n\n`;
  }
  
  if (compliance.overallScore < 70) {
    body += `3. **📈 Improve Compliance Posture**\n   - Current compliance score (${compliance.overallScore.toFixed(1)}%) is below target\n   - Review and implement security controls per framework requirements\n\n`;
  }

  // Add action items
  body += `### ✅ Action Items\n\n`;
  body += `- [ ] Review and remediate all critical alerts within 48 hours\n`;
  body += `- [ ] Enable security features on all repositories\n`;
  body += `- [ ] Schedule security training for development teams\n`;
  body += `- [ ] Implement automated remediation workflows\n`;
  body += `- [ ] Review and update security policies\n`;

  // Add footer
  body += `\n---\n\n`;
  body += `*This issue was automatically generated by the GHAS Audit workflow.*\n`;
  body += `*Full audit results are available as artifacts in the workflow run.*`;

  return body;
}

function extractDashboardSummary(htmlContent) {
  // Extract key information from HTML dashboard for issue comment
  // This is a simplified extraction - in production, use a proper HTML parser
  return `The full executive dashboard includes detailed visualizations and metrics. Please download the artifact for complete analysis.`;
}

// Run the script
createIssue();