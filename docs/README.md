# Documentation System for AI Development

This `/docs` folder contains a comprehensive tracking system designed for **AI context switching efficiency**.

## 📚 File Purpose & Usage

### 🎯 **AI_PROJECT_STATE.md** - Current Technical State
**When to read:** Start of every AI session  
**Contains:**
- Current working features
- Known bugs & issues  
- Key file locations & functions
- Technical architecture overview
- Last session summary

### 🏆 **FEATURE_MOSCOW.md** - Priority Matrix
**When to read:** When planning what to work on next  
**Contains:**
- Must/Should/Could/Won't prioritization
- Feature completion status
- Technical debt tracking
- Immediate next actions

### ⚡ **QUICK_REF.md** - Fast Context Loading  
**When to read:** During development for quick lookups  
**Contains:**
- File structure map
- Key function locations (with line numbers)
- Common search patterns
- Development commands
- State variable reference

### 📅 **DEVELOPMENT_LOG.md** - Session History
**When to read:** To understand progression between sessions  
**Contains:**
- Chronological change history
- Problem → Solution mapping
- Files modified per session
- Testing status tracking

## 🚀 Optimal AI Workflow

**Starting a new session:**
1. Read `AI_PROJECT_STATE.md` → Get current technical context
2. Check `FEATURE_MOSCOW.md` → Identify next priority
3. Reference `QUICK_REF.md` → Find exact file locations
4. Use `search_code` with patterns from QUICK_REF
5. Make targeted changes (max 30 lines per edit)
6. Update tracking files with new progress

**Ending a session:**
1. Update `AI_PROJECT_STATE.md` with new status
2. Update `FEATURE_MOSCOW.md` completion status  
3. Add entry to `DEVELOPMENT_LOG.md`
4. Commit changes: `git add docs/ && git commit -m "Update AI context"`

## 💡 Efficiency Tips

- **File Reading**: Use `search_code` instead of `read_file` when possible
- **Targeted Edits**: Edit specific functions, not entire files  
- **Context Preservation**: Always update docs at end of session
- **Quick Lookup**: Use QUICK_REF function line numbers for direct editing

## 🎯 Success Metrics

**This system works when AI can:**
- Start productive work within 2 minutes of reading docs
- Find specific functions without full file reads  
- Understand project status without re-analyzing code
- Make targeted changes efficiently

---
*Created: August 25, 2025 | Purpose: Maximize AI development efficiency*
