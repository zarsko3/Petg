# Generate Tasks Workflow

## Purpose
Break down a PRD into actionable, ordered tasks that can be implemented incrementally.

## Process

### 1. Analyze PRD
- Review all requirements and acceptance criteria
- Identify dependencies between components
- Consider implementation order and complexity

### 2. Create Task Structure
Organize tasks in logical groups:

```markdown
# Task List: [Feature Name]

## Phase 1: Foundation
- [ ] Task 1.1: [Description]
- [ ] Task 1.2: [Description]

## Phase 2: Core Features
- [ ] Task 2.1: [Description]
- [ ] Task 2.2: [Description]

## Phase 3: Enhancement
- [ ] Task 3.1: [Description]
- [ ] Task 3.2: [Description]

## Phase 4: Testing & Polish
- [ ] Task 4.1: [Description]
- [ ] Task 4.2: [Description]
```

### 3. Task Guidelines
Each task should be:
- **Specific**: Clear, actionable description
- **Atomic**: Can be completed in one session
- **Testable**: Has clear completion criteria
- **Ordered**: Dependencies are respected
- **Scoped**: Reasonable size for review

### 4. Task Format
```
- [ ] Task X.Y: [Brief description]
  - **Files**: List of files to modify
  - **Acceptance**: What constitutes completion
  - **Dependencies**: Tasks that must be done first
```

## Output
Save as `/tasks/tasks-prd-[feature].md`

