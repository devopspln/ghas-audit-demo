# GHAS Audit Workflow Architecture

## Overview
This diagram illustrates the end-to-end GitHub Advanced Security audit automation workflow for compliance reporting.

## Workflow Diagram

```mermaid
flowchart TD
    %% Module 4 Learning-Focused GHAS Audit Flow
    
    A[🎯 Start Audit] --> B[🔍 Scan Repositories]
    
    B --> C{GHAS Features Enabled?}
    C -->|Yes| D[📊 Collect Security Data]
    C -->|No| E[⚠️ Enable GHAS Features]
    E --> D
    
    D --> F[Code Scanning]
    D --> G[Secret Scanning] 
    D --> H[Dependency Scanning]
    
    F --> I[🎯 Calculate Risk Score]
    G --> I
    H --> I
    
    I --> J[📋 Check Compliance]
    J --> K[OWASP Score]
    J --> L[NIST Score]
    J --> M[ISO Score]
    
    K --> N[📊 Generate Dashboard]
    L --> N
    M --> N
    
    N --> O[📈 Executive Summary]
    N --> P[🛠️ Recommendations]
    
    O --> Q[✅ Audit Complete]
    P --> Q
    
    Q --> R[📤 Present to Leadership]
    
    %% Styling for clarity
    classDef startEnd fill:#e1f5fe,stroke:#0277bd,stroke-width:3px
    classDef process fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef decision fill:#fff8e1,stroke:#f57c00,stroke-width:2px
    classDef ghasFeature fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef compliance fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef output fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    
    class A,Q,R startEnd
    class B,D,I,N process
    class C decision
    class F,G,H ghasFeature
    class J,K,L,M compliance
    class O,P output
    class E process
```

## Module 4 Learning Flow

This simplified workflow focuses on the core learning objectives for conducting a final security audit:

### 🎯 **Phase 1: Discovery & Setup**
- **Start Audit** - Initiate comprehensive security assessment
- **Scan Repositories** - Identify all repositories in scope
- **Check GHAS Features** - Verify security scanning is enabled

### 🔍 **Phase 2: Data Collection**
- **Code Scanning** - Static analysis for vulnerabilities
- **Secret Scanning** - Detect exposed credentials and keys  
- **Dependency Scanning** - Find vulnerable packages and libraries

### 📊 **Phase 3: Risk Assessment**
- **Calculate Risk Score** - Aggregate findings by severity
- **Check Compliance** - Map findings to security frameworks
- **Generate Framework Scores** - OWASP, NIST, ISO compliance ratings

### 📈 **Phase 4: Executive Reporting**
- **Generate Dashboard** - Visual charts and risk matrices
- **Executive Summary** - Business-focused findings overview
- **Recommendations** - Prioritized action items with timelines

### 🎓 **Phase 5: Presentation**
- **Present to Leadership** - Communicate findings and next steps

## Student Learning Checkpoints

✅ **Checkpoint 1**: Successfully enable GHAS features  
✅ **Checkpoint 2**: Collect security data from all three scanning types  
✅ **Checkpoint 3**: Calculate meaningful risk and compliance scores  
✅ **Checkpoint 4**: Generate executive-ready dashboard  
✅ **Checkpoint 5**: Present findings with clear recommendations  

## Color Legend

- 🔵 **Start/End** - Beginning and completion points
- 🟣 **Process** - Core audit activities  
- 🟠 **Decision** - Critical checkpoints requiring action
- 🟢 **GHAS Features** - GitHub Advanced Security capabilities
- 🔴 **Compliance** - Framework alignment activities
- 🔵 **Output** - Reports and deliverables

---

*Last Updated: 2024-01-XX*
*Maintainer: Tim Warner - Pluralsight GHAS Course*
