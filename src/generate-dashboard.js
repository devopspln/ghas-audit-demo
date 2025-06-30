#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import Handlebars from 'handlebars';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

program
  .name('generate-dashboard')
  .description('Generate an executive dashboard from audit results')
  .version('1.0.0')
  .requiredOption('-i, --input <file>', 'Input audit JSON file')
  .option('-o, --output <file>', 'Output HTML file', 'reports/executive-dashboard.html')
  .option('-t, --template <file>', 'Custom template file')
  .parse();

const options = program.opts();

// Chart configuration
const chartJSNodeCanvas = new ChartJSNodeCanvas({ 
  width: 800, 
  height: 400,
  backgroundColour: 'white',
});

// Register Handlebars helpers
Handlebars.registerHelper('eq', (a, b) => a === b);
Handlebars.registerHelper('gt', (a, b) => a > b);
Handlebars.registerHelper('formatDate', (date) => new Date(date).toLocaleDateString());
Handlebars.registerHelper('formatNumber', (num) => num.toLocaleString());
Handlebars.registerHelper('toFixed', (num, decimals) => Number(num).toFixed(decimals));
Handlebars.registerHelper('severityColor', (severity) => {
  const colors = {
    critical: '#dc3545',
    high: '#fd7e14',
    medium: '#ffc107',
    low: '#28a745',
  };
  return colors[severity.toLowerCase()] || '#6c757d';
});

async function generateDashboard() {
  try {
    // Read audit results
    const auditData = JSON.parse(await fs.readFile(options.input, 'utf8'));
    
    // Generate charts
    const charts = await generateCharts(auditData);
    
    // Prepare dashboard data
    const dashboardData = {
      ...auditData,
      charts,
      generatedAt: new Date().toISOString(),
      recommendations: generateRecommendations(auditData),
      riskScore: calculateRiskScore(auditData),
      executiveSummary: generateExecutiveSummary(auditData),
    };
    
    // Load template
    const templatePath = options.template || path.join(__dirname, '..', 'templates', 'dashboard.hbs');
    let templateContent;
    
    try {
      templateContent = await fs.readFile(templatePath, 'utf8');
    } catch (error) {
      // Use default template if custom template not found
      templateContent = getDefaultTemplate();
    }
    
    // Compile and render template
    const template = Handlebars.compile(templateContent);
    const html = template(dashboardData);
    
    // Save output
    const outputPath = path.resolve(options.output);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, html);
    
    console.log(chalk.green(`✅ Dashboard generated: ${outputPath}`));
    
  } catch (error) {
    console.error(chalk.red('Error generating dashboard:'), error.message);
    process.exit(1);
  }
}

async function generateCharts(auditData) {
  const charts = {};
  
  // 1. Severity Distribution Pie Chart
  const severityData = {
    labels: ['Critical', 'High', 'Medium', 'Low'],
    datasets: [{
      data: [
        auditData.summary.criticalAlerts,
        auditData.summary.highAlerts,
        auditData.summary.mediumAlerts,
        auditData.summary.lowAlerts,
      ],
      backgroundColor: ['#dc3545', '#fd7e14', '#ffc107', '#28a745'],
    }],
  };
  
  charts.severityDistribution = await chartJSNodeCanvas.renderToDataURL({
    type: 'pie',
    data: severityData,
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Alert Severity Distribution',
          font: { size: 18 },
        },
        legend: { position: 'right' },
      },
    },
  });
  
  // 2. Alert Types Bar Chart
  const alertTypesData = {
    labels: ['Code Scanning', 'Secret Scanning', 'Dependencies'],
    datasets: [{
      label: 'Number of Alerts',
      data: [
        auditData.summary.codeAlerts,
        auditData.summary.secretAlerts,
        auditData.summary.dependencyAlerts,
      ],
      backgroundColor: ['#0d6efd', '#6610f2', '#6f42c1'],
    }],
  };
  
  charts.alertTypes = await chartJSNodeCanvas.renderToDataURL({
    type: 'bar',
    data: alertTypesData,
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Alerts by Type',
          font: { size: 18 },
        },
        legend: { display: false },
      },
      scales: {
        y: { beginAtZero: true },
      },
    },
  });
  
  // 3. Compliance Scores Radar Chart
  const complianceData = {
    labels: Object.keys(auditData.compliance.frameworks),
    datasets: [{
      label: 'Compliance Score (%)',
      data: Object.values(auditData.compliance.frameworks).map(f => f.score),
      backgroundColor: 'rgba(13, 110, 253, 0.2)',
      borderColor: 'rgba(13, 110, 253, 1)',
      pointBackgroundColor: 'rgba(13, 110, 253, 1)',
    }],
  };
  
  charts.compliance = await chartJSNodeCanvas.renderToDataURL({
    type: 'radar',
    data: complianceData,
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Compliance Framework Scores',
          font: { size: 18 },
        },
      },
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          ticks: { stepSize: 20 },
        },
      },
    },
  });
  
  // 4. Repository Risk Matrix
  const repoRiskData = auditData.repositories
    .filter(repo => repo.metrics.totalAlerts > 0)
    .map(repo => ({
      x: repo.metrics.totalAlerts,
      y: repo.metrics.meanTimeToResolve || 0,
      r: Math.sqrt(repo.metrics.totalAlerts) * 5,
      label: repo.name,
    }));
  
  charts.riskMatrix = await chartJSNodeCanvas.renderToDataURL({
    type: 'bubble',
    data: {
      datasets: [{
        label: 'Repository Risk',
        data: repoRiskData,
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
      }],
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Repository Risk Matrix',
          font: { size: 18 },
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const point = context.raw;
              return `${point.label}: ${point.x} alerts, ${point.y.toFixed(1)} days MTTR`;
            },
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: 'Total Alerts' },
          beginAtZero: true,
        },
        y: {
          title: { display: true, text: 'Mean Time to Resolve (days)' },
          beginAtZero: true,
        },
      },
    },
  });
  
  return charts;
}

function calculateRiskScore(auditData) {
  let score = 0;
  const weights = {
    critical: 10,
    high: 5,
    medium: 2,
    low: 1,
  };
  
  // Calculate based on alert severity
  score += auditData.summary.criticalAlerts * weights.critical;
  score += auditData.summary.highAlerts * weights.high;
  score += auditData.summary.mediumAlerts * weights.medium;
  score += auditData.summary.lowAlerts * weights.low;
  
  // Normalize to 0-100 scale
  const maxPossibleScore = auditData.summary.totalAlerts * weights.critical;
  const riskScore = maxPossibleScore > 0 ? (score / maxPossibleScore) * 100 : 0;
  
  return {
    score: riskScore,
    level: riskScore > 75 ? 'Critical' : riskScore > 50 ? 'High' : riskScore > 25 ? 'Medium' : 'Low',
    color: riskScore > 75 ? '#dc3545' : riskScore > 50 ? '#fd7e14' : riskScore > 25 ? '#ffc107' : '#28a745',
  };
}

function generateRecommendations(auditData) {
  const recommendations = [];
  
  // Check for critical alerts
  if (auditData.summary.criticalAlerts > 0) {
    recommendations.push({
      priority: 'Critical',
      title: 'Address Critical Security Alerts',
      description: `There are ${auditData.summary.criticalAlerts} critical security alerts that require immediate attention.`,
      action: 'Review and remediate all critical alerts within 24-48 hours.',
    });
  }
  
  // Check for repos without security features
  const unprotectedRepos = auditData.repositories.filter(repo => 
    !repo.securityFeatures.codeScanning.enabled ||
    !repo.securityFeatures.secretScanning.enabled ||
    !repo.securityFeatures.dependabot.enabled
  );
  
  if (unprotectedRepos.length > 0) {
    recommendations.push({
      priority: 'High',
      title: 'Enable Security Features',
      description: `${unprotectedRepos.length} repositories lack complete security scanning coverage.`,
      action: 'Enable code scanning, secret scanning, and Dependabot for all repositories.',
    });
  }
  
  // Check compliance scores
  const lowComplianceFrameworks = Object.entries(auditData.compliance.frameworks)
    .filter(([_, data]) => data.score < 70)
    .map(([framework, _]) => framework);
  
  if (lowComplianceFrameworks.length > 0) {
    recommendations.push({
      priority: 'Medium',
      title: 'Improve Compliance Scores',
      description: `Compliance scores for ${lowComplianceFrameworks.join(', ')} are below target.`,
      action: 'Review compliance requirements and implement necessary controls.',
    });
  }
  
  // Check mean time to resolve
  const avgMTTR = auditData.repositories.reduce((sum, repo) => 
    sum + repo.metrics.meanTimeToResolve, 0
  ) / auditData.repositories.length;
  
  if (avgMTTR > 30) {
    recommendations.push({
      priority: 'Medium',
      title: 'Reduce Alert Resolution Time',
      description: `Average alert resolution time is ${avgMTTR.toFixed(1)} days.`,
      action: 'Implement automated remediation and improve incident response processes.',
    });
  }
  
  return recommendations;
}

function generateExecutiveSummary(auditData) {
  const totalAlerts = auditData.summary.totalAlerts;
  const criticalHighAlerts = auditData.summary.criticalAlerts + auditData.summary.highAlerts;
  const complianceScore = auditData.compliance.overallScore;
  const securityCoverage = (auditData.summary.scannedRepositories / auditData.summary.totalRepositories) * 100;
  
  let summary = `This security audit assessed ${auditData.summary.totalRepositories} repositories in the ${auditData.metadata.organization} organization. `;
  
  if (totalAlerts === 0) {
    summary += 'No security alerts were found, indicating a strong security posture. ';
  } else if (criticalHighAlerts > 0) {
    summary += `A total of ${totalAlerts} security alerts were identified, including ${criticalHighAlerts} critical/high severity issues that require immediate attention. `;
  } else {
    summary += `A total of ${totalAlerts} security alerts were identified, all of medium or low severity. `;
  }
  
  summary += `The overall compliance score is ${complianceScore.toFixed(1)}%, `;
  
  if (complianceScore >= 80) {
    summary += 'demonstrating strong adherence to security frameworks. ';
  } else if (complianceScore >= 60) {
    summary += 'indicating room for improvement in security practices. ';
  } else {
    summary += 'revealing significant gaps in security compliance that need to be addressed. ';
  }
  
  summary += `Security scanning coverage is at ${securityCoverage.toFixed(1)}% of repositories.`;
  
  return summary;
}

function getDefaultTemplate() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GHAS Security Audit Dashboard</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            border-radius: 10px;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header p { opacity: 0.9; }
        .summary-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .card {
            background: white;
            padding: 25px;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: transform 0.2s;
        }
        .card:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.15); }
        .card h3 { 
            color: #666;
            font-size: 0.9em;
            text-transform: uppercase;
            margin-bottom: 10px;
        }
        .card .value { 
            font-size: 2.5em;
            font-weight: bold;
            color: #333;
        }
        .card.critical { border-left: 4px solid #dc3545; }
        .card.high { border-left: 4px solid #fd7e14; }
        .card.medium { border-left: 4px solid #ffc107; }
        .card.low { border-left: 4px solid #28a745; }
        .risk-score {
            background: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .risk-score .score {
            font-size: 4em;
            font-weight: bold;
            margin: 20px 0;
        }
        .executive-summary {
            background: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .executive-summary h2 { margin-bottom: 20px; color: #333; }
        .charts {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 30px;
            margin-bottom: 30px;
        }
        .chart-container {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
        }
        .chart-container img { max-width: 100%; height: auto; }
        .recommendations {
            background: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .recommendations h2 { margin-bottom: 20px; }
        .recommendation {
            padding: 20px;
            margin-bottom: 15px;
            border-radius: 8px;
            background: #f8f9fa;
            border-left: 4px solid #0d6efd;
        }
        .recommendation.critical { border-left-color: #dc3545; }
        .recommendation.high { border-left-color: #fd7e14; }
        .recommendation.medium { border-left-color: #ffc107; }
        .recommendation h4 { margin-bottom: 10px; }
        .recommendation .priority {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8em;
            font-weight: bold;
            margin-bottom: 10px;
            color: white;
        }
        .recommendation .priority.Critical { background: #dc3545; }
        .recommendation .priority.High { background: #fd7e14; }
        .recommendation .priority.Medium { background: #ffc107; color: #333; }
        .repository-details {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .repository-details h2 { margin-bottom: 20px; }
        .repo-table {
            width: 100%;
            border-collapse: collapse;
        }
        .repo-table th, .repo-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        .repo-table th {
            background: #f8f9fa;
            font-weight: bold;
        }
        .repo-table tr:hover { background: #f8f9fa; }
        .footer {
            text-align: center;
            padding: 30px;
            color: #666;
            font-size: 0.9em;
        }
        .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: bold;
        }
        .badge.enabled { background: #28a745; color: white; }
        .badge.disabled { background: #dc3545; color: white; }
        @media print {
            body { background: white; }
            .card, .chart-container, .executive-summary, .recommendations, .repository-details {
                box-shadow: none;
                break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Security Audit Dashboard</h1>
            <p>Organization: {{metadata.organization}} | Date: {{formatDate generatedAt}}</p>
        </div>

        <div class="risk-score">
            <h2>Overall Risk Score</h2>
            <div class="score" style="color: {{riskScore.color}}">{{toFixed riskScore.score 1}}</div>
            <p>Risk Level: <strong>{{riskScore.level}}</strong></p>
        </div>

        <div class="executive-summary">
            <h2>Executive Summary</h2>
            <p>{{executiveSummary}}</p>
        </div>

        <div class="summary-cards">
            <div class="card">
                <h3>Total Repositories</h3>
                <div class="value">{{formatNumber summary.totalRepositories}}</div>
            </div>
            <div class="card">
                <h3>Scanned Repositories</h3>
                <div class="value">{{formatNumber summary.scannedRepositories}}</div>
            </div>
            <div class="card">
                <h3>Total Alerts</h3>
                <div class="value">{{formatNumber summary.totalAlerts}}</div>
            </div>
            <div class="card critical">
                <h3>Critical Alerts</h3>
                <div class="value">{{formatNumber summary.criticalAlerts}}</div>
            </div>
            <div class="card high">
                <h3>High Alerts</h3>
                <div class="value">{{formatNumber summary.highAlerts}}</div>
            </div>
            <div class="card medium">
                <h3>Medium Alerts</h3>
                <div class="value">{{formatNumber summary.mediumAlerts}}</div>
            </div>
        </div>

        <div class="charts">
            <div class="chart-container">
                <img src="{{charts.severityDistribution}}" alt="Severity Distribution">
            </div>
            <div class="chart-container">
                <img src="{{charts.alertTypes}}" alt="Alert Types">
            </div>
            <div class="chart-container">
                <img src="{{charts.compliance}}" alt="Compliance Scores">
            </div>
            <div class="chart-container">
                <img src="{{charts.riskMatrix}}" alt="Risk Matrix">
            </div>
        </div>

        <div class="recommendations">
            <h2>Recommendations</h2>
            {{#each recommendations}}
            <div class="recommendation {{toLowerCase priority}}">
                <span class="priority {{priority}}">{{priority}}</span>
                <h4>{{title}}</h4>
                <p>{{description}}</p>
                <p><strong>Action:</strong> {{action}}</p>
            </div>
            {{/each}}
        </div>

        <div class="repository-details">
            <h2>Repository Details</h2>
            <table class="repo-table">
                <thead>
                    <tr>
                        <th>Repository</th>
                        <th>Total Alerts</th>
                        <th>Code Scanning</th>
                        <th>Secret Scanning</th>
                        <th>Dependabot</th>
                        <th>Branch Protection</th>
                    </tr>
                </thead>
                <tbody>
                    {{#each repositories}}
                    <tr>
                        <td><a href="{{url}}" target="_blank">{{name}}</a></td>
                        <td>{{metrics.totalAlerts}}</td>
                        <td>
                            {{#if securityFeatures.codeScanning.enabled}}
                                <span class="badge enabled">Enabled</span>
                            {{else}}
                                <span class="badge disabled">Disabled</span>
                            {{/if}}
                        </td>
                        <td>
                            {{#if securityFeatures.secretScanning.enabled}}
                                <span class="badge enabled">Enabled</span>
                            {{else}}
                                <span class="badge disabled">Disabled</span>
                            {{/if}}
                        </td>
                        <td>
                            {{#if securityFeatures.dependabot.enabled}}
                                <span class="badge enabled">Enabled</span>
                            {{else}}
                                <span class="badge disabled">Disabled</span>
                            {{/if}}
                        </td>
                        <td>
                            {{#if securityFeatures.branchProtection.enabled}}
                                <span class="badge enabled">Enabled</span>
                            {{else}}
                                <span class="badge disabled">Disabled</span>
                            {{/if}}
                        </td>
                    </tr>
                    {{/each}}
                </tbody>
            </table>
        </div>

        <div class="footer">
            <p>Generated by GHAS Audit Tool v{{metadata.version}} on {{formatDate generatedAt}}</p>
            <p>© 2024 GitHub Advanced Security Audit - Pluralsight Course</p>
        </div>
    </div>
</body>
</html>`;
}

// Helper to convert to lowercase
Handlebars.registerHelper('toLowerCase', (str) => str.toLowerCase());

// Run dashboard generation
generateDashboard();