#!/usr/bin/env node

import chalk from 'chalk';
import ora from 'ora';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function setup() {
  console.log(chalk.blue.bold('\n🚀 GHAS Audit Setup Wizard\n'));
  
  // Check Node.js version
  const nodeVersion = process.versions.node;
  const majorVersion = parseInt(nodeVersion.split('.')[0]);
  
  if (majorVersion < 18) {
    console.error(chalk.red(`❌ Node.js version ${nodeVersion} is not supported. Please upgrade to Node.js 18 or higher.`));
    process.exit(1);
  }
  
  console.log(chalk.green(`✅ Node.js version ${nodeVersion} detected`));
  
  // Check if .env exists
  const envPath = path.join(__dirname, '..', '.env');
  const envExists = await fs.access(envPath).then(() => true).catch(() => false);
  
  if (!envExists) {
    console.log(chalk.yellow('\n📝 Creating .env file from template...'));
    
    // Copy .env.example to .env
    const envExamplePath = path.join(__dirname, '..', '.env.example');
    const envContent = await fs.readFile(envExamplePath, 'utf8');
    await fs.writeFile(envPath, envContent);
    
    console.log(chalk.yellow('\n⚠️  Please configure your .env file with:'));
    console.log('  1. GitHub Personal Access Token (GH_PAT_READ_ORG)');
    console.log('  2. Organization name (GITHUB_ORG)');
    console.log(`\nEdit the file at: ${chalk.cyan(envPath)}\n`);
  }
  
  // Interactive configuration
  const configure = await question('Would you like to configure your settings now? (y/n) ');
  
  if (configure.toLowerCase() === 'y') {
    console.log(chalk.blue('\n🔧 Configuration\n'));
    
    const token = await question('GitHub Personal Access Token (will be hidden): ');
    const org = await question('GitHub Organization name: ');
    
    // Update .env file
    let envContent = await fs.readFile(envPath, 'utf8');
    envContent = envContent.replace(/GH_PAT_READ_ORG=.*/, `GH_PAT_READ_ORG=${token}`);
    envContent = envContent.replace(/GITHUB_ORG=.*/, `GITHUB_ORG=${org}`);
    await fs.writeFile(envPath, envContent);
    
    console.log(chalk.green('\n✅ Configuration saved!'));
  }
  
  // Install dependencies
  const spinner = ora('Installing dependencies...').start();
  
  try {
    execSync('npm install', { stdio: 'ignore', cwd: path.join(__dirname, '..') });
    spinner.succeed('Dependencies installed');
  } catch (error) {
    spinner.fail('Failed to install dependencies');
    console.error(chalk.red('\nPlease run "npm install" manually'));
  }
  
  // Create necessary directories
  const dirs = ['reports', 'logs'];
  for (const dir of dirs) {
    const dirPath = path.join(__dirname, '..', dir);
    await fs.mkdir(dirPath, { recursive: true });
  }
  
  console.log(chalk.green('\n✅ Setup complete!\n'));
  
  console.log(chalk.blue('📚 Next steps:'));
  console.log('  1. Configure your .env file if you haven\'t already');
  console.log('  2. Run an audit: ' + chalk.cyan('npm run audit'));
  console.log('  3. Generate dashboard: ' + chalk.cyan('npm run dashboard'));
  console.log('  4. View the GitHub Actions workflow in .github/workflows/');
  
  console.log(chalk.blue('\n🔒 Security Notes:'));
  console.log('  - Never commit your .env file');
  console.log('  - Use a fine-grained PAT with minimal permissions');
  console.log('  - Store secrets in GitHub Secrets for Actions');
  
  console.log(chalk.green('\n🎉 Happy auditing!\n'));
  
  rl.close();
}

setup().catch(error => {
  console.error(chalk.red('Setup failed:'), error);
  process.exit(1);
});