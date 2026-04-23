# SahakarHelp Tools Project Structure

```
SahakarHelp/
│
├── frontend/                # Next.js application (app router)
│   ├── public/              # Static assets
│   ├── src/
│   │   ├── app/             # App router directory
│   │   │   ├── (public)/    # Public routes
│   │   │   │   ├── page.js  # Homepage
│   │   │   │   └── tools/   # Tool routes
│   │   │   ├── (admin)/     # Admin routes
│   │   │   │   ├── page.js  # Admin dashboard
│   │   │   │   └── tools/   # Tool management
│   │   ├── components/      # UI components
│   │   ├── services/        # API service layer
│   │   ├── lib/             # Tool calculation logic
│   │   │   └── tools/       # Per-tool logic modules
│   │   ├── contexts/        # React contexts
│   │   └── styles/          # Tailwind config
│   ├── next.config.js
│   └── package.json
│
├── backend/                 # Express application
│   ├── config/              # Environment configs
│   ├── controllers/         # Route handlers
│   ├── services/            # Business logic
│   ├── models/              # MongoDB schemas
│   │   └── ToolMetadata.js  # Tool definition model
│   ├── routes/              # API endpoints
│   ├── middleware/          # Auth & validation
│   │   ├── auth.js          # HTTP-only cookie auth
│   │   └── errorHandler.js  # Error middleware
│   ├── validators/          # Request validators
│   ├── utils/               # Helper functions
│   │   └── logger.js        # Logging system
│   ├── server.js            # Entry point
│   └── package.json
│
├── shared/                  # Shared resources
│   └── schemas/             # Validation schemas
│
├── .env.example             # Environment template
├── .gitignore
└── README.md                # Setup instructions
```

## Initial Implementation Plan

We'll focus on Phase 1: Basic setup + EMI Calculator

```mermaid
gantt
    title Phase 1 Implementation
    dateFormat  YYYY-MM-DD
    section Project Setup
    Monorepo structure      :a1, 2026-04-19, 1d
    Next.js frontend        :after a1, 2d
    Express backend         :after a1, 2d
    MongoDB connection      :after a1, 1d
    Tailwind CSS            :after a1, 1d

    section EMI Calculator
    Tool metadata model     :2026-04-20, 1d
    Calculation logic       :2026-04-21, 1d
    Input form component    :2026-04-22, 1d
    Result display          :2026-04-22, 1d
    PDF export              :2026-04-23, 1d

    section Authentication
    HTTP-only cookie auth   :2026-04-24, 2d
    Login/Logout UI         :2026-04-25, 1d
```

## Key Architecture Decisions

1. **HTTP-only Cookie Authentication**:
   - More secure than localStorage for JWT tokens
   - Protected against XSS attacks
   - Requires same-site and secure flags

2. **Modular Tool System**:
   ```mermaid
   classDiagram
     class ToolComponent {
       +inputs: FormData
       +calculate()
       +renderResult()
       +exportPDF()
     }
     class EMICalculator {
       +principal: number
       +rate: number
       +tenure: number
       +calculateEMI()
     }
     ToolComponent <|-- EMICalculator
   ```

3. **Error Handling**:
   - Centralized error middleware
   - Logging to file and console
   - Custom error classes for API errors