# Process Task List Workflow

## Purpose
Implement tasks iteratively with review and approval at each step.

## Process

### 1. Task Execution
For each task:
- Read the task description carefully
- Identify files to modify
- Implement the required changes
- Test the implementation
- Document changes made

### 2. Change Documentation
After completing each task, provide:
- **Summary**: What was changed and why
- **Files Modified**: List of files touched
- **Diff**: Show the actual code changes
- **Tests**: Any tests added or modified
- **Rationale**: Why this approach was chosen
- **Risks**: Any potential issues or considerations

### 3. Approval Loop
- Present the completed task to the user
- Wait for explicit approval before proceeding
- If changes requested, stay on current task
- Mark task complete only after approval

### 4. Task Completion
When approved:
- Mark the task as complete in the task list
- Move to the next task in sequence
- Maintain context between tasks

### 5. Quality Standards
- Work in small, reviewable increments
- Keep changes scoped to current task
- Avoid drive-by edits
- Add/update tests when applicable
- Run tests before asking for approval

## Output
- Updated task list with completion status
- Clean, tested code changes
- Clear documentation of changes

