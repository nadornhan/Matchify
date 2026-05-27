# Matchify - Intelligent Talent Matching Platform

- Course: CSIT314 Systems Development Methodologies 
- Session: Autumn 2026
- Institution: University of Wollongong
- Development Methodology: Agile Scrum Framework
- Backend Architecture: Serverless Backend-as-a-Service (Supabase)

---

## Table of Contents
1. Project Overview
2. Project Team and Governance
3. Scope Enhancements and Change Management (Week 8)
4. System Architecture and Data Design
5. Project Management Framework
6. Installation and Local Configuration
7. Deployment Strategy

---

## 1. Project Overview
Matchify is a comprehensive web-based recruitment application designed to optimise the efficiency of talent acquisition and employment searches. The platform implements a bidirectional intelligent matching mechanism engineered to align the requirements of two primary user cohorts:
- Candidates: Job seekers who receive automated, high-relevance employment recommendations derived from their individual profiles, competencies, and structural preferences.
- Employers: Organisations capable of deploying explicit Job Descriptions (JDs) that are systematically evaluated against active and passive candidate profiles to return optimal matches.

---

## 2. Project Team and Governance
The development squad operates within a strict Agile Scrum framework. Technical ownership, risk management, and administrative responsibilities are distributed to maintain high velocity and comprehensive quality control:

| Student Name | Student ID | Scrum / Project Role | Primary Technical Responsibility |
| :--- | :--- | :--- | :--- |
| Thi Khanh Linh Phan | 8487868 | Scrum Master / Developer | Core Application Development, API Integration, Testing |
| Thanh Nhan Nguyen | 8486347 | Lead Developer | Backend Architecture, Database Operations, Synchronization |
| Jovin Cheah Ju Ying | 9782850 | Business Analyst / PM | Change Management, System Analysis, UML Documentation |
| Chris Wong Wai Hin | 9955987 | UI/UX Designer | Frontend Interface Design, Responsiveness, Structural Layout |
| Rui Bian | 8540457 | DevOps Engineer | Sprint Tracking, CI/CD Pipeline Configuration, Deployments |

---

## 3. Scope Enhancements and Change Management (Week 8)
In compliance with the compulsory Requirement Change initiated during Week 8 of the academic session, the development team executed an impact analysis to integrate three substantial system modifications seamlessly into the existing pipeline:

### 3.1 Candidate Profile Enhancement
The foundational candidate data structures were expanded to achieve higher granular precision in matching logic. The schema was altered to integrate:
- Structural parameters for professional work history.
- Detailed technical and soft skill taxonomies.
- Preferred operational environments (comprising Remote, On-site, and Hybrid matrices).
- Preferred geographic locations.

### 3.2 Tiered Membership Infrastructure
To accommodate distinct commercial operational thresholds, a dual-tier resource access mechanism was introduced for both candidate and corporate entities:
- Standard Tier (Non-membership): Restricts the recommendation computation engine to a hard ceiling of the top ten matches (where K=10 and N=10).
- Premium Tier (Membership): Removes analytical constraints, allowing unrestricted execution of full-set recommendation arrays.

### 3.3 Advanced Search and Algorithmic Fuzzy Matching
The retrieval engine was upgraded from a basic text lookup to a multi-tiered query processor:
- Direct Keyword Mapping: Executes string queries against composite attributes within user records.
- Conditional Filtering: Permits structured sorting according to categorical attributes (salary brackets, locations, contract forms).
- Robust Fuzzy Query Processing: Minimises null-result errors by handling typographical anomalies and semantic equivalents. Approximate inputs such as "sofware enginer" or generic terms like "programmer" are normalized to match the canonical "software engineer" database records.

---

## 4. System Architecture and Data Design
Matchify utilises a serverless, decoupled Backend-as-a-Service (BaaS) architecture powered by Supabase. This eliminates the operational overhead of intermediate custom application server frameworks (such as Express, Django, or Spring Boot). Business logic executes within the client-side browser space using Vanilla JavaScript, communicating directly with the hosted relational database layer.

### 4.1 Technical Stack Components
- Structure: Semantic HyperText Markup Language (HTML5).
- Styling: Custom Cascading Style Sheets (CSS3) employing responsive grid structures and accessible colour tokens.
- Application Logic: Functional Vanilla JavaScript (ES6+ Modules).
- Persistence: Supabase client libraries interfaces with a PostgreSQL relational storage system. Local browser storage serves as a fault-tolerant fallback.

### 4.2 File Organisation
- index.html: Establishes the core document object model and semantic interface segments.
- matchify.css: Directs layout presentation, visual hierarchy, and cross-device responsive breakpoints.
- matchifyMain.js: Coordinates application workflows, event dispatches, and interface state mutations.
- matchifyData.js: Models the persistent data abstraction layer, managing in-memory dataset synchronisation and API execution paths.
- supabase-config.js: Enforces environment configuration and initialises client database connection endpoints.

---

## 5. Project Management Framework
Operational discipline and transparency throughout the development lifecycle are maintained via rigorous project governance standards:

### 5.1 Automated Kanban Board Execution
Task progress is tracked using an integrated GitHub Projects environment segmented into five distinct lanes:
1. Product Backlog: Contains raw requirements and unassigned User Stories (US01 through US10).
2. Sprint Backlog: Tracks elements committed to the active development sprint cycle.
3. In Progress: Identifies items currently undergoing active engineering.
4. Peer Review: Isolates complete source increments awaiting rigorous code quality verification.
5. Done: Captures thoroughly validated components that satisfy the established Definition of Done (DoD).

### 5.2 Branching Strategy (Git Feature Branch Workflow)
Branch protection policies prevent direct commits to the primary production branch. 
- Branch Naming Syntax: `feature/US-[Identifier]-[BriefDescription]` or `bugfix/[Description]`.
- Integration Workflow: Merging into the main branch necessitates a minimum of one successful peer review validation alongside a clean local execution log.

### 5.3 Version History Standardisation
The project enforces strict adherence to conventional commit messaging protocols to ensure traceability across the version history:
- `feat:` Used for the introduction of discrete functional components.
- `fix:` Assigned to patches addressing logical anomalies or interface rendering defects.
- `docs:` Applied to modifications involving technical or administrative documentation.
- `refactor:` Reserved for internal code restructuring that preserves existing functional execution paths.

---

## 6. Installation and Local Configuration

To initiate and evaluate the system deployment locally, execute the following procedure:

### 6.1 Prerequisites
- A compliant web browser engine supporting ECMAScript 6 modules.
- A local Hypertext Transfer Protocol (HTTP) server utility (such as Visual Studio Code Live Server, NodeJS http-server, or Python server modules).

### 6.2 Step-by-Step Setup
1. Clone the remote repository structure:
   ```bash
   git clone [https://github.com/nadornhan/Matchify.git](https://github.com/nadornhan/Matchify.git)
   cd Matchify

2. Establish Environment Pointers:
Verify or generate the `supabase-config.js` script within the root directory and supply valid configuration parameters:
   ```javascript
   const SUPABASE_URL = "[https://your-project-reference.supabase.co](https://your-project-reference.supabase.co)";
   const SUPABASE_ANON_KEY = "your-public-anon-key-string";

   export { SUPABASE_URL, SUPABASE_ANON_KEY };

Note: Only public anonymous keys must be declared within frontend scripts. Master keys must remain undisclosed to prevent security breaches.

3. Initialise the Local Server Environment:
Utilising the native Python HTTP module:
   ```bash
   python -m http-server 8080

Direct the browser application client to `http://localhost:8080` to access the primary platform console.

---

### 7. Deployment
Matchify features an active automated Continuous Deployment (CD) strategy:
- Every approved Pull Request merged into the main branch automatically triggers a build compilation and deploys the working prototype live to GitHub Pages.
- **Live Demonstration Link:** https://nadornhan.github.io/Matchify/


