#!/usr/bin/env node

import { Command } from 'commander';
import { Octokit } from '@octokit/rest';
import { graphql } from '@octokit/graphql';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const program = new Command();

program
  .name('ghas-audit')
  .description('Run a comprehensive GitHub Advanced Security audit')
  .version('1.0.0')
  .option('-o, --org <org>', 'GitHub organization to audit', process.env.GITHUB_ORG)
  .option('-s, --scope <scope>', 'Audit scope (all, critical, custom)', 'all')
  .option('-r, --repos <repos>', 'Specific repositories to audit (comma-separated)')
  .option('--output <file>', 'Output file for audit results', `reports/audit-${new Date().toISOString().slice(0, 10)}.json`)
  .option('--token <token>', 'GitHub token', process.env.GH_PAT_READ_ORG)
  .parse();

const options = program.opts();

// Validate required options
if (!options.org) {
  console.error(chalk.red('Error: Organization name is required'));
  process.exit(1);
}

if (!options.token) {
  console.error(chalk.red('Error: GitHub token is required (set GH_PAT_READ_ORG environment variable)'));
  process.exit(1);
}

// Initialize Octokit
const octokit = new Octokit({
  auth: options.token,
});

const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: `token ${options.token}`,
  },
});

// Audit class
class GHASAudit {
  constructor(org, options) {
    this.org = org;
    this.options = options;
    this.results = {
      metadata: {
        organization: org,
        auditDate: new Date().toISOString(),
        scope: options.scope,
        version: '1.0.0',
      },
      summary: {
        totalRepositories: 0,
        scannedRepositories: 0,
        totalAlerts: 0,
        criticalAlerts: 0,
        highAlerts: 0,
        mediumAlerts: 0,
        lowAlerts: 0,
        secretAlerts: 0,
        dependencyAlerts: 0,
        codeAlerts: 0,
      },
      repositories: [],
      compliance: {
        overallScore: 0,
        frameworks: {},
      },
    };
  }

  async run() {
    console.log(chalk.blue.bold(`\n🔍 Starting GHAS Security Audit for ${this.org}\n`));

    const spinner = ora('Fetching repositories...').start();

    try {
      // Get repositories to audit
      const repos = await this.getRepositories();
      spinner.succeed(`Found ${repos.length} repositories to audit`);

      this.results.summary.totalRepositories = repos.length;

      // Audit each repository
      for (const repo of repos) {
        await this.auditRepository(repo);
      }

      // Calculate compliance scores
      this.calculateCompliance();

      // Save results
      await this.saveResults();

      // Print summary
      this.printSummary();

    } catch (error) {
      spinner.fail('Audit failed');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  }

  async getRepositories() {
    if (this.options.repos) {
      // Audit specific repositories
      const repoNames = this.options.repos.split(',').map(r => r.trim());
      const repos = [];

      for (const repoName of repoNames) {
        try {
          const { data } = await octokit.repos.get({
            owner: this.org,
            repo: repoName,
          });
          repos.push(data);
        } catch (error) {
          console.warn(chalk.yellow(`Warning: Could not access repository ${repoName}`));
        }
      }

      return repos;
    }

    // Get all repositories in the organization
    const repos = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const { data } = await octokit.repos.listForOrg({
        org: this.org,
        type: 'all',
        per_page: 100,
        page,
      });

      repos.push(...data);
      hasMore = data.length === 100;
      page++;
    }

    // Filter based on scope
    if (this.options.scope === 'critical') {
      // In a real scenario, you might have a list of critical repos
      // For now, we'll filter by topics or other criteria
      return repos.filter(repo =>
        repo.topics?.includes('critical') ||
        repo.topics?.includes('production') ||
        repo.name.includes('api') ||
        repo.name.includes('auth')
      );
    }

    return repos;
  }

  async auditRepository(repo) {
    const spinner = ora(`Auditing ${repo.name}...`).start();

    try {
      const repoAudit = {
        name: repo.name,
        url: repo.html_url,
        private: repo.private,
        defaultBranch: repo.default_branch,
        lastUpdated: repo.updated_at,
        securityFeatures: await this.getSecurityFeatures(repo),
        alerts: {
          code: [],
          secret: [],
          dependency: [],
        },
        metrics: {
          totalAlerts: 0,
          openAlerts: 0,
          closedAlerts: 0,
          meanTimeToResolve: 0,
        },
      };

      // Get code scanning alerts
      try {
        repoAudit.alerts.code = await this.getCodeScanningAlerts(repo);
      } catch (error) {
        repoAudit.securityFeatures.codeScanning.error = error.message;
      }

      // Get secret scanning alerts
      try {
        repoAudit.alerts.secret = await this.getSecretScanningAlerts(repo);
      } catch (error) {
        repoAudit.securityFeatures.secretScanning.error = error.message;
      }

      // Get Dependabot alerts
      try {
        repoAudit.alerts.dependency = await this.getDependabotAlerts(repo);
      } catch (error) {
        repoAudit.securityFeatures.dependabot.error = error.message;
      }

      // Calculate metrics
      this.calculateRepoMetrics(repoAudit);

      // Update summary
      this.updateSummary(repoAudit);

      this.results.repositories.push(repoAudit);
      this.results.summary.scannedRepositories++;

      spinner.succeed(`${repo.name} - ${repoAudit.metrics.totalAlerts} alerts found`);

    } catch (error) {
      spinner.fail(`${repo.name} - Error: ${error.message}`);
    }
  }

  async getSecurityFeatures(repo) {
    const features = {
      codeScanning: { enabled: false, lastRun: null },
      secretScanning: { enabled: false, pushProtection: false },
      dependabot: { enabled: false, securityUpdates: false },
      branchProtection: { enabled: false, rules: [] },
    };

    try {
      // Check code scanning
      const { data: codeScanning } = await octokit.request('GET /repos/{owner}/{repo}/code-scanning/analyses', {
        owner: this.org,
        repo: repo.name,
        per_page: 1,
      }).catch(() => ({ data: [] }));

      if (codeScanning.length > 0) {
        features.codeScanning.enabled = true;
        features.codeScanning.lastRun = codeScanning[0].created_at;
      }

      // Check secret scanning (requires admin access)
      try {
        await octokit.request('GET /repos/{owner}/{repo}/secret-scanning/alerts', {
          owner: this.org,
          repo: repo.name,
          per_page: 1,
        });
        features.secretScanning.enabled = true;
      } catch (error) {
        if (error.status !== 404) {
          features.secretScanning.enabled = true;
        }
      }

      // Check Dependabot
      const { data: vulnerabilityAlerts } = await octokit.request('GET /repos/{owner}/{repo}', {
        owner: this.org,
        repo: repo.name,
      });

      features.dependabot.enabled = vulnerabilityAlerts.has_vulnerability_alerts || false;

      // Check branch protection
      try {
        const { data: protection } = await octokit.repos.getBranchProtection({
          owner: this.org,
          repo: repo.name,
          branch: repo.default_branch,
        });
        features.branchProtection.enabled = true;
        features.branchProtection.rules = protection;
      } catch (error) {
        // Branch protection not enabled
      }

    } catch (error) {
      console.warn(chalk.yellow(`Warning: Could not fetch all security features for ${repo.name}`));
    }

    return features;
  }

  async getCodeScanningAlerts(repo) {
    const alerts = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const { data } = await octokit.request('GET /repos/{owner}/{repo}/code-scanning/alerts', {
          owner: this.org,
          repo: repo.name,
          state: 'open',
          per_page: 100,
          page,
        });

        alerts.push(...data.map(alert => ({
          number: alert.number,
          state: alert.state,
          severity: alert.rule.security_severity_level || 'unknown',
          rule: alert.rule.id,
          description: alert.rule.description,
          path: alert.most_recent_instance.location?.path,
          createdAt: alert.created_at,
          tool: alert.tool.name,
        })));

        hasMore = data.length === 100;
        page++;
      } catch (error) {
        hasMore = false;
        if (error.status !== 404) {
          throw error;
        }
      }
    }

    return alerts;
  }

  async getSecretScanningAlerts(repo) {
    const alerts = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const { data } = await octokit.request('GET /repos/{owner}/{repo}/secret-scanning/alerts', {
          owner: this.org,
          repo: repo.name,
          state: 'open',
          per_page: 100,
          page,
        });

        alerts.push(...data.map(alert => ({
          number: alert.number,
          state: alert.state,
          secretType: alert.secret_type,
          secretTypeDisplayName: alert.secret_type_display_name,
          createdAt: alert.created_at,
          resolvedAt: alert.resolved_at,
          resolvedBy: alert.resolved_by?.login,
          pushProtectionBypassed: alert.push_protection_bypassed,
        })));

        hasMore = data.length === 100;
        page++;
      } catch (error) {
        hasMore = false;
        if (error.status !== 404 && error.status !== 403) {
          throw error;
        }
      }
    }

    return alerts;
  }

  async getDependabotAlerts(repo) {
    const alerts = [];

    try {
      const query = `
        query($org: String!, $repo: String!, $cursor: String) {
          repository(owner: $org, name: $repo) {
            vulnerabilityAlerts(first: 100, after: $cursor, states: OPEN) {
              nodes {
                id
                createdAt
                dismissedAt
                securityVulnerability {
                  severity
                  package {
                    name
                    ecosystem
                  }
                  advisory {
                    summary
                    description
                    cvss {
                      score
                    }
                  }
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        }
      `;

      let hasNextPage = true;
      let cursor = null;

      while (hasNextPage) {
        const result = await graphqlWithAuth(query, {
          org: this.org,
          repo: repo.name,
          cursor,
        });

        if (result.repository?.vulnerabilityAlerts?.nodes) {
          alerts.push(...result.repository.vulnerabilityAlerts.nodes.map(alert => ({
            id: alert.id,
            createdAt: alert.createdAt,
            severity: alert.securityVulnerability.severity,
            package: alert.securityVulnerability.package.name,
            ecosystem: alert.securityVulnerability.package.ecosystem,
            summary: alert.securityVulnerability.advisory.summary,
            cvssScore: alert.securityVulnerability.advisory.cvss?.score,
          })));

          hasNextPage = result.repository.vulnerabilityAlerts.pageInfo.hasNextPage;
          cursor = result.repository.vulnerabilityAlerts.pageInfo.endCursor;
        } else {
          hasNextPage = false;
        }
      }
    } catch (error) {
      // GraphQL API might not be available
      console.warn(chalk.yellow(`Warning: Could not fetch Dependabot alerts via GraphQL for ${repo.name}`));
    }

    return alerts;
  }

  calculateRepoMetrics(repoAudit) {
    const allAlerts = [
      ...repoAudit.alerts.code,
      ...repoAudit.alerts.secret,
      ...repoAudit.alerts.dependency,
    ];

    repoAudit.metrics.totalAlerts = allAlerts.length;
    repoAudit.metrics.openAlerts = allAlerts.filter(a => a.state === 'open' || !a.dismissedAt).length;
    repoAudit.metrics.closedAlerts = repoAudit.metrics.totalAlerts - repoAudit.metrics.openAlerts;

    // Calculate mean time to resolve (simplified)
    const resolvedAlerts = allAlerts.filter(a => a.resolvedAt || a.dismissedAt);
    if (resolvedAlerts.length > 0) {
      const resolutionTimes = resolvedAlerts.map(a => {
        const created = new Date(a.createdAt);
        const resolved = new Date(a.resolvedAt || a.dismissedAt);
        return (resolved - created) / (1000 * 60 * 60 * 24); // Days
      });

      repoAudit.metrics.meanTimeToResolve =
        resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length;
    }
  }

  updateSummary(repoAudit) {
    // Update alert counts
    this.results.summary.totalAlerts += repoAudit.metrics.totalAlerts;

    // Count by severity
    repoAudit.alerts.code.forEach(alert => {
      switch (alert.severity) {
        case 'critical':
          this.results.summary.criticalAlerts++;
          break;
        case 'high':
          this.results.summary.highAlerts++;
          break;
        case 'medium':
          this.results.summary.mediumAlerts++;
          break;
        case 'low':
          this.results.summary.lowAlerts++;
          break;
      }
    });

    repoAudit.alerts.dependency.forEach(alert => {
      switch (alert.severity) {
        case 'CRITICAL':
          this.results.summary.criticalAlerts++;
          break;
        case 'HIGH':
          this.results.summary.highAlerts++;
          break;
        case 'MODERATE':
          this.results.summary.mediumAlerts++;
          break;
        case 'LOW':
          this.results.summary.lowAlerts++;
          break;
      }
    });

    // Count by type
    this.results.summary.codeAlerts += repoAudit.alerts.code.length;
    this.results.summary.secretAlerts += repoAudit.alerts.secret.length;
    this.results.summary.dependencyAlerts += repoAudit.alerts.dependency.length;
  }

  calculateCompliance() {
    const repos = this.results.repositories;
    const totalRepos = repos.length;

    if (totalRepos === 0) return;

    // Calculate overall compliance score
    const scores = {
      scanning: 0,
      protection: 0,
      resolution: 0,
    };

    repos.forEach(repo => {
      // Scanning compliance
      if (repo.securityFeatures.codeScanning.enabled) scores.scanning += 0.33;
      if (repo.securityFeatures.secretScanning.enabled) scores.scanning += 0.33;
      if (repo.securityFeatures.dependabot.enabled) scores.scanning += 0.34;

      // Protection compliance
      if (repo.securityFeatures.branchProtection.enabled) scores.protection += 0.5;
      if (repo.securityFeatures.secretScanning.pushProtection) scores.protection += 0.5;

      // Resolution compliance (based on open vs closed alerts)
      if (repo.metrics.totalAlerts > 0) {
        scores.resolution += (repo.metrics.closedAlerts / repo.metrics.totalAlerts);
      } else {
        scores.resolution += 1; // No alerts is compliant
      }
    });

    // Average scores
    Object.keys(scores).forEach(key => {
      scores[key] = (scores[key] / totalRepos) * 100;
    });

    this.results.compliance.overallScore =
      (scores.scanning + scores.protection + scores.resolution) / 3;

    // Framework compliance mapping
    this.results.compliance.frameworks = {
      'OWASP': {
        score: this.calculateOWASPCompliance(),
        details: 'Based on OWASP Top 10 coverage',
      },
      'NIST': {
        score: this.calculateNISTCompliance(),
        details: 'Based on NIST Cybersecurity Framework',
      },
      'ISO27001': {
        score: this.calculateISOCompliance(),
        details: 'Based on ISO 27001 controls',
      },
    };
  }

  calculateOWASPCompliance() {
    // Simplified OWASP compliance calculation
    let score = 0;
    const repos = this.results.repositories;

    // Check for injection vulnerabilities
    const injectionAlerts = repos.reduce((count, repo) =>
      count + repo.alerts.code.filter(a => a.rule.includes('injection')).length, 0
    );
    if (injectionAlerts === 0) score += 10;

    // Check for broken authentication
    const authAlerts = repos.reduce((count, repo) =>
      count + repo.alerts.code.filter(a => a.rule.includes('auth')).length, 0
    );
    if (authAlerts === 0) score += 10;

    // Check for sensitive data exposure (secrets)
    if (this.results.summary.secretAlerts === 0) score += 20;

    // Check for security misconfiguration
    const configAlerts = repos.reduce((count, repo) =>
      count + repo.alerts.code.filter(a => a.rule.includes('config')).length, 0
    );
    if (configAlerts === 0) score += 10;

    // Check for vulnerable components
    if (this.results.summary.dependencyAlerts < 5) score += 20;
    else if (this.results.summary.dependencyAlerts < 20) score += 10;

    // Base score for having scanning enabled
    const scanningEnabled = repos.filter(r =>
      r.securityFeatures.codeScanning.enabled
    ).length;
    score += (scanningEnabled / repos.length) * 30;

    return Math.min(score, 100);
  }

  calculateNISTCompliance() {
    // Simplified NIST CSF compliance
    const repos = this.results.repositories;
    let score = 0;

    // Identify: Asset management
    score += 20; // Assume we're tracking all repos

    // Protect: Access control and data protection
    const protectedRepos = repos.filter(r =>
      r.securityFeatures.branchProtection.enabled
    ).length;
    score += (protectedRepos / repos.length) * 20;

    // Detect: Security monitoring
    const monitoredRepos = repos.filter(r =>
      r.securityFeatures.codeScanning.enabled ||
      r.securityFeatures.secretScanning.enabled ||
      r.securityFeatures.dependabot.enabled
    ).length;
    score += (monitoredRepos / repos.length) * 20;

    // Respond: Incident response
    const avgResponseTime = repos.reduce((sum, repo) =>
      sum + repo.metrics.meanTimeToResolve, 0
    ) / repos.length;
    if (avgResponseTime < 7) score += 20; // Less than 7 days
    else if (avgResponseTime < 30) score += 10;

    // Recover: Planning and improvements
    score += 20; // Assume we have this audit process

    return Math.min(score, 100);
  }

  calculateISOCompliance() {
    // Simplified ISO 27001 compliance
    const repos = this.results.repositories;
    let score = 0;

    // A.12.6 Technical vulnerability management
    const vulnMgmt = repos.filter(r =>
      r.securityFeatures.dependabot.enabled
    ).length;
    score += (vulnMgmt / repos.length) * 25;

    // A.14.2 Security in development
    const secDev = repos.filter(r =>
      r.securityFeatures.codeScanning.enabled
    ).length;
    score += (secDev / repos.length) * 25;

    // A.13.1 Network security
    const secretMgmt = repos.filter(r =>
      r.securityFeatures.secretScanning.enabled
    ).length;
    score += (secretMgmt / repos.length) * 25;

    // A.18.1 Compliance
    score += 25; // Having this audit process

    return Math.min(score, 100);
  }

  async saveResults() {
    const outputPath = path.resolve(this.options.output);
    const outputDir = path.dirname(outputPath);

    // Create directory if it doesn't exist
    await fs.mkdir(outputDir, { recursive: true });

    // Save JSON results
    await fs.writeFile(
      outputPath,
      JSON.stringify(this.results, null, 2)
    );

    console.log(chalk.green(`\n✅ Audit results saved to: ${outputPath}`));
  }

  printSummary() {
    console.log(chalk.blue.bold('\n📊 Audit Summary\n'));

    const summary = this.results.summary;
    console.log(`Total Repositories: ${summary.totalRepositories}`);
    console.log(`Scanned Repositories: ${summary.scannedRepositories}`);
    console.log(`Total Alerts: ${summary.totalAlerts}`);

    console.log(chalk.red(`\n🚨 Critical: ${summary.criticalAlerts}`));
    console.log(chalk.yellow(`⚠️  High: ${summary.highAlerts}`));
    console.log(chalk.blue(`ℹ️  Medium: ${summary.mediumAlerts}`));
    console.log(chalk.gray(`📝 Low: ${summary.lowAlerts}`));

    console.log('\nAlert Types:');
    console.log(`  Code Scanning: ${summary.codeAlerts}`);
    console.log(`  Secret Scanning: ${summary.secretAlerts}`);
    console.log(`  Dependencies: ${summary.dependencyAlerts}`);

    console.log(chalk.green('\n✅ Compliance Scores:'));
    console.log(`  Overall: ${this.results.compliance.overallScore.toFixed(1)}%`);
    Object.entries(this.results.compliance.frameworks).forEach(([framework, data]) => {
      console.log(`  ${framework}: ${data.score.toFixed(1)}%`);
    });
  }
}

// Run the audit
const audit = new GHASAudit(options.org, options);
audit.run().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});
