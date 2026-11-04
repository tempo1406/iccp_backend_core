# ICCP Demo Flows

These Mermaid diagrams summarize the main product flows found in the backend modules. 
Visual convention: actor = blue, process = purple, decision = yellow, success = green, failure/return = red.

## 1. Guest to Organization Onboarding

```mermaid
flowchart LR
 A[Guest/User] --> B[View Public Landing Page]
 B --> C{Interested?}
 C -->|Submit lead| D[Send Contact Info]
 D --> E[Notify Organization Admin]
 C -->|Create account| F[Register Account]
 F --> G[Verify Email OTP]
 G --> H[Log In]
 H --> I{Join Path}
 I -->|Create tenant| J[Create Organization]
 J --> K[Become Organization Owner]
 I -->|Accept invite| L[Accept Org/Project Invitation]
 L --> M[Access Assigned Workspace]

 classDef actor fill:#b7d9ff,stroke:#5d9ee8,stroke-width:2px,color:#263238;
 classDef process fill:#d8c7ff,stroke:#9b7cf2,stroke-width:2px,color:#2f2840;
 classDef decision fill:#ffdd4d,stroke:#e6b800,stroke-width:2px,color:#3a3000;
 classDef success fill:#bff0d2,stroke:#62c98b,stroke-width:2px,color:#123524;

 class A actor;
 class B,D,E,F,G,H,J,L process;
 class C,I decision;
 class K,M success;
```

## 2. Organization Admin Setup

```mermaid
flowchart LR
 A[Organization Admin] --> B[Update Organization Profile]
 B --> C[Configure Branding<br/>and Chatbot Settings]
 C --> D[Create/Edit Landing Page]
 D --> E[Publish Page<br/>or Save Draft]

 A --> F[Invite Members]
 F --> G[Member Accepts Invitation]
 G --> H[Activate/Deactivate<br/>or Remove Member]

 A --> I[Create Organization Roles]
 I --> J[Assign Permissions]
 J --> K[Assign Roles to Members]

 A --> L[Configure Working Time<br/>and Org Settings]

 classDef actor fill:#b7d9ff,stroke:#5d9ee8,stroke-width:2px,color:#263238;
 classDef process fill:#d8c7ff,stroke:#9b7cf2,stroke-width:2px,color:#2f2840;
 classDef success fill:#bff0d2,stroke:#62c98b,stroke-width:2px,color:#123524;

 class A actor;
 class B,C,D,F,G,H,I,J,K,L process;
 class E success;
```

## 3. Document and Knowledge Management

```mermaid
flowchart LR
 A[Admin / PM] --> B[Upload Document]
 B --> C[Set Metadata<br/>Folder / Category / Project / Scope]
 C --> D[Grant Access<br/>User / Role / Project]
 D --> E[Store Document<br/>with Version History]
 E --> F[Index into Chunks]
 F --> G{ Indexed?}

 G -->|Yes| H[Available in Knowledge Base]
 H --> I[Authorized Member<br/>Views Document Tree/List]
 I --> J[Open Document<br/>or Source Chunk]
 H --> K[AI/RAG Retrieves<br/>Authorized Chunks]
 K --> L[Chatbot Answers<br/>with Citations]

 G -->|No| M[Index Failed<br/>Back to Admin / PM]
 M --> B

 classDef actor fill:#b7d9ff,stroke:#5d9ee8,stroke-width:2px,color:#263238;
 classDef process fill:#d8c7ff,stroke:#9b7cf2,stroke-width:2px,color:#2f2840;
 classDef decision fill:#ffdd4d,stroke:#e6b800,stroke-width:2px,color:#3a3000;
 classDef success fill:#bff0d2,stroke:#62c98b,stroke-width:2px,color:#123524;
 classDef danger fill:#ffb6b6,stroke:#f06464,stroke-width:2px,color:#4a1111;

 class A actor;
 class B,C,D,E,F,I,J,K,L process;
 class G decision;
 class H success;
 class M danger;
```

## 4. Project Setup and Team Assignment

```mermaid
flowchart LR
 A[Org Admin / Project Creator] --> B[Create Project]
 B --> C[Assign or Invite PM]
 C --> D{PM Accepted?}
 D -->|Yes| E[PM Joins Project]
 D -->|No| F[Invite Pending / Rejected]
 F --> C

 E --> G[Invite Project Members]
 G --> H[Members Join Project]
 E --> I[Create Project Roles]
 I --> J[Assign Project Permissions]
 J --> K[Assign Roles to Members]
 E --> L[Configure Settings<br/>and Task Statuses]

 classDef actor fill:#b7d9ff,stroke:#5d9ee8,stroke-width:2px,color:#263238;
 classDef process fill:#d8c7ff,stroke:#9b7cf2,stroke-width:2px,color:#2f2840;
 classDef decision fill:#ffdd4d,stroke:#e6b800,stroke-width:2px,color:#3a3000;
 classDef success fill:#bff0d2,stroke:#62c98b,stroke-width:2px,color:#123524;
 classDef danger fill:#ffb6b6,stroke:#f06464,stroke-width:2px,color:#4a1111;

 class A actor;
 class B,C,G,I,J,K,L process;
 class D decision;
 class E,H success;
 class F danger;
```

## 5. Task Execution Flow

```mermaid
flowchart LR
 A[Project Manager] --> B[Create Task]
 B --> C[Assign to Member]
 C --> D[Member Views Task]
 D --> E[Update Status]
 E --> F[Comment / Mention / React]
 F --> G[Upload Attachment<br/>or Add Web Link]
 G --> H[System Records History]
 H --> I[PM Tracks Dashboard<br/>Progress and KPI]
 I --> J{Need Update?}
 J -->|Yes| K[Update Task<br/>Assignee / Status]
 K --> D
 J -->|No| L[Task Completed]

 classDef actor fill:#b7d9ff,stroke:#5d9ee8,stroke-width:2px,color:#263238;
 classDef process fill:#d8c7ff,stroke:#9b7cf2,stroke-width:2px,color:#2f2840;
 classDef decision fill:#ffdd4d,stroke:#e6b800,stroke-width:2px,color:#3a3000;
 classDef success fill:#bff0d2,stroke:#62c98b,stroke-width:2px,color:#123524;

 class A actor;
 class B,C,D,E,F,G,H,I,K process;
 class J decision;
 class L success;
```

## 6. Worklog and Daily Report Flow

```mermaid
flowchart LR
 A[Organization Member] --> B[Work on Assigned Task]
 B --> C[Create Task Worklog]
 C --> D[Update Actual Logged Time]
 D --> E[Open My Daily Report]
 E --> F[Generate Draft<br/>from Worklogs]
 F --> G[Edit Summary<br/>Blockers / Tomorrow Plan]
 G --> H[Submit Daily Report]
 H --> I[Notify Project Manager]
 I --> J[PM Reviews Report]
 J --> K{Review Action}
 K -->|Comment| L[Add Review Comment]
 K -->|Seen| M[Mark as Seen]
 L --> N[Notify Member]
 M --> N

 classDef actor fill:#b7d9ff,stroke:#5d9ee8,stroke-width:2px,color:#263238;
 classDef process fill:#d8c7ff,stroke:#9b7cf2,stroke-width:2px,color:#2f2840;
 classDef decision fill:#ffdd4d,stroke:#e6b800,stroke-width:2px,color:#3a3000;
 classDef success fill:#bff0d2,stroke:#62c98b,stroke-width:2px,color:#123524;

 class A actor;
 class B,C,D,E,F,G,H,I,J,L,N process;
 class K decision;
 class M success;
```

## 7. Internal Chat and Notification Flow

```mermaid
flowchart LR
 A[User] --> B[Open Chat]
 B --> C[List My Rooms]
 C --> D{Room Exists?}
 D -->|No| E[Create Channel<br/>DM / Group DM]
 D -->|Discover| F[Join Public Room]
 D -->|Invite| G[Invite Members]
 D -->|Yes| H[Open Room]
 E --> H
 F --> H
 G --> H
 H --> I[Send Message]
 I --> J[Attach / React / Pin]
 J --> K[Update Unread<br/>Mentions / Read State]
 K --> L[Realtime Websocket Event]
 L --> M[Mark Notifications as Read]

 classDef actor fill:#b7d9ff,stroke:#5d9ee8,stroke-width:2px,color:#263238;
 classDef process fill:#d8c7ff,stroke:#9b7cf2,stroke-width:2px,color:#2f2840;
 classDef decision fill:#ffdd4d,stroke:#e6b800,stroke-width:2px,color:#3a3000;
 classDef success fill:#bff0d2,stroke:#62c98b,stroke-width:2px,color:#123524;

 class A actor;
 class B,C,E,F,G,H,I,J,K,L process;
 class D decision;
 class M success;
```

## 8. Ticket Request and Overtime Flow

```mermaid
flowchart LR
 A[Member] --> B[Create Ticket Request]
 B --> C[Select Type<br/>and Reason]
 C --> D[Submit Request]
 D --> E[Approver Reviews]
 E --> F{Approved?}
 F -->|Yes| G[Request Approved]
 F -->|No| H[Request Rejected]
 F -->|Changes| I[Member Updates Request]
 I --> D

 J[Project Manager] --> K[Create Overtime Request]
 K --> L[BUL / Approver Confirms]
 L --> M{Pre-approved?}
 M -->|No| K
 M -->|Yes| N[Member Declares OT Effort]
 N --> O[PM Confirms Effort]
 O --> P{Effort OK?}
 P -->|No| N
 P -->|Yes| Q[Final Approver / HR Baseline]
 Q --> R{Completed?}
 R -->|Yes| S[Overtime Completed]
 R -->|No| N

 classDef actor fill:#b7d9ff,stroke:#5d9ee8,stroke-width:2px,color:#263238;
 classDef process fill:#d8c7ff,stroke:#9b7cf2,stroke-width:2px,color:#2f2840;
 classDef decision fill:#ffdd4d,stroke:#e6b800,stroke-width:2px,color:#3a3000;
 classDef success fill:#bff0d2,stroke:#62c98b,stroke-width:2px,color:#123524;
 classDef danger fill:#ffb6b6,stroke:#f06464,stroke-width:2px,color:#4a1111;

 class A,J actor;
 class B,C,D,E,I,K,L,N,O,Q process;
 class F,M,P,R decision;
 class G,S success;
 class H danger;
```


## 9. Periodic Report Flow

```mermaid
flowchart LR
 A[Org Admin] --> B[Configure Periodic Reports<br/>Monthly / Quarterly / Yearly]
 B --> C[Save Schedule Settings]
 C --> D{Auto Enabled?}
 D -->|Yes| E[Scheduler Creates Due Run]
 D -->|No| F[No Auto Report]

 G[Admin] --> H[Send Report Now]
 E --> I[Create or Reuse Report Run]
 H --> I
 I --> J[Build KPI Snapshot<br/>and CSV Files]
 J --> K[Send Email / In-App]
 K --> L{Delivered?}
 L -->|Yes| M[Report Sent]
 L -->|No / Partial| N[Retry or Mark Failed]
 M --> O[View History<br/>Artifacts and Attempts]
 N --> O

 classDef actor fill:#b7d9ff,stroke:#5d9ee8,stroke-width:2px,color:#263238;
 classDef process fill:#d8c7ff,stroke:#9b7cf2,stroke-width:2px,color:#2f2840;
 classDef decision fill:#ffdd4d,stroke:#e6b800,stroke-width:2px,color:#3a3000;
 classDef success fill:#bff0d2,stroke:#62c98b,stroke-width:2px,color:#123524;
 classDef danger fill:#ffb6b6,stroke:#f06464,stroke-width:2px,color:#4a1111;

 class A,G actor;
 class B,C,E,H,I,J,K,N process;
 class D,L decision;
 class M,O success;
 class F danger;
```

## 10. KPI Analytics Flow

```mermaid
flowchart LR
 A[Org Admin / HR / PM / Member] --> B[Configure KPI Inputs]
 B --> C[Org Working Time<br/>and Holidays]
 B --> D[KPI Targets<br/>User / Role / Project Role]
 B --> E[Task Points<br/>Estimated Hours / Allocation]

 E --> F[Members Execute Tasks<br/>and Log Work]
 F --> G[Tasks, Worklogs,<br/>Daily Reports]
 F --> H[Approved Overtime Tickets]
 C --> I[Real-time KPI Calculation]
 D --> I
 G --> I
 H --> I

 I --> J{KPI Scope}
 J -->|Project| K[Project KPI Overview]
 K --> L[Project Member Ranking]
 L --> M[Member KPI Detail]

 J -->|Organization| N[Org KPI Overview]
 N --> O[Org Member Ranking]
 O --> P[Org Member KPI Detail]

 J -->|Self| Q[My KPI Detail]

 M --> R[Performance Score<br/>Points / On-time / OT]
 P --> R
 Q --> R
 R --> S[Decision Support<br/>Review, Reward, or Improve]

 classDef actor fill:#b7d9ff,stroke:#5d9ee8,stroke-width:2px,color:#263238;
 classDef process fill:#d8c7ff,stroke:#9b7cf2,stroke-width:2px,color:#2f2840;
 classDef decision fill:#ffdd4d,stroke:#e6b800,stroke-width:2px,color:#3a3000;
 classDef success fill:#bff0d2,stroke:#62c98b,stroke-width:2px,color:#123524;

 class A actor;
 class B,C,D,E,F,G,H,I,K,L,M,N,O,P,Q,R process;
 class J decision;
 class S success;
```
