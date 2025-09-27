# 🎯 Goal Breaker - Revised MoSCoW Prioritization
**Date:** September 27, 2025  
**Based on:** Current SimpleGoalBreaker state analysis

## Current State Analysis

### ✅ What SimpleGoalBreaker HAS
- PPT-style positioning (horizontal/vertical smart layout)
- Add child/sibling with + buttons
- Dynamic font sizing based on text length
- Connection lines between goals
- Level-based color coding
- Text editing inline

### ❌ What SimpleGoalBreaker is MISSING (vs old PPTGoalBreaker)
- **No selection system** - can't select cards
- **No canvas panning** - stuck in one view
- **No delete functionality** - can only add
- **No completion marking** - no way to track progress
- **No keyboard shortcuts** - must use mouse for everything
- **No helper text** - no guidance for users
- **No save/load** - work is lost on refresh
- **No menu system** - no access to settings/features

---

## 🚀 MUST HAVE (Core Functionality - Blocks Real Usage)

### 1. Canvas Navigation ⭐ **[CRITICAL - Week 1]**
**Why:** Can't use app with larger goal trees without panning  
**Feasibility:** ✅ Easy - CanvasManager already exists with this logic  
**User Value:** 🔥 Essential - Without this, app breaks with >5 goals

- Spacebar + drag to pan canvas
- Middle mouse button panning
- **Implementation:** Import CanvasManager component (already built and tested)

### 2. Card Selection & Basic Actions ⭐ **[CRITICAL - Week 1]**
**Why:** Can't modify or remove goals, only add them  
**Feasibility:** ✅ Easy - Pattern exists in archived PPTGoalBreaker  
**User Value:** 🔥 Essential - Core CRUD operations

- Click to select card (highlight border)
- Delete selected card (keyboard or button)
- Mark as complete (green background + strikethrough)
- Escape to deselect

### 3. Helper Text System ⭐ **[QUICK WIN - Week 1]**
**Why:** Users won't discover keyboard shortcuts without guidance  
**Feasibility:** ✅ Very Easy - Already extracted and documented  
**User Value:** 🔥 High - Improves discoverability 10x

- Show contextual hints at bottom of screen
- Display keyboard shortcut keys in styled <kbd> tags
- Show "👋 Start by typing your main goal" for new users
- **Implementation:** Copy from `__archive__/HELPER_TEXT_EXTRACTED.tsx`

---

## 💪 SHOULD HAVE (High Value, Not Blocking)

### 4. Keyboard Shortcuts ⭐ **[Week 2]**
**Why:** 10x faster workflow for power users  
**Feasibility:** ✅ Easy - Logic exists in PPTGoalBreaker, just port it  
**User Value:** 🔥 High - Reduces friction dramatically

- **Tab** = Add child to selected card
- **Enter** = Add sibling to selected card
- **Escape** = Cancel editing / Deselect
- Delete key = Remove selected card

### 5. Save/Load System ⭐ **[Week 2-3]**
**Why:** Current app loses all work on refresh - not usable  
**Feasibility:** ⚠️ Medium - Need localStorage + menu UI  
**User Value:** 🔥 Critical for real usage

- Auto-save to localStorage every change
- Simple "Saved projects" list in menu
- Load previous projects
- Clear/reset current project

### 6. 90-Degree Connectors ⭐ **[Week 3]**
**Why:** Current diagonal lines look unprofessional  
**Feasibility:** ⚠️ Medium - Requires path calculation logic  
**User Value:** 💎 High - Visual polish, matches PPT style

- Orthogonal (right-angle) connectors like PowerPoint
- Proper arrow heads at connection points

---

## 🎨 COULD HAVE (Nice to Have, Lower Priority)

### 7. Zoom Feature **[Week 4+]**
**Why:** Helpful for very large goal trees (50+ cards)  
**Feasibility:** ⚠️ Medium - Requires transform logic + UI controls  
**User Value:** 💡 Medium - Most users won't hit this limit initially

- Zoom in/out with mouse wheel or controls
- Fit to screen button

### 8. Visual Polish **[Week 4+]**
**Why:** Make it more visually appealing  
**Feasibility:** ✅ Easy - Just CSS changes  
**User Value:** 💡 Medium - Nice but not critical

- Darker blue canvas background
- Better contrast between cards and background
- Subtle shadows and depth

### 9. Priority System **[Future]**
**Why:** Helps users identify important goals  
**Feasibility:** ⚠️ Medium-Hard - Requires UI + sorting logic  
**User Value:** 💡 Medium - Useful but adds complexity

- Mark goals as High/Medium/Low priority
- Optional: Auto-sort by priority
- Visual indicators (colors or icons)

---

## 🚫 WON'T DO (Not Recommended)

### ❌ Mermaid Import/Export
**Why Not:** 
- High complexity (parsing, validation, error handling)
- Niche use case - most users won't use it
- Adds cognitive load with another format to learn
- **80/20 Rule:** 5% of work for 1% of users

**Alternative:** Simple JSON export/import is sufficient

### ❌ Multiple File Type Support (.xlsx, .docx, etc)
**Why Not:**
- Over-engineering for MVP
- Each format requires different parsing library
- Maintenance nightmare
- Most users will use native format

**Alternative:** Export to JSON/text is enough initially

### ❌ List View with Code Editor
**Why Not:**
- Duplicates functionality (already have canvas)
- Adds complexity without clear benefit
- Code view is too technical for target users (overwhelmed problem solvers)
- **Focus:** One great view beats two mediocre views

**Alternative:** Keep it simple with canvas only for now

### ❌ Linking Goals Across Levels
**Why Not:**
- Unclear UX - how would users create/visualize these links?
- Adds visual clutter (crossing lines)
- Deviates from tree structure mental model
- Complex to implement properly

### ❌ Assumptions Drawer
**Why Not:**
- Unclear value proposition
- Adds UI complexity
- Most users won't use it
- Better solved with goal notes in future

### ❌ Board Titles
**Why Not:**
- Very low priority
- Can be added in 5 minutes when needed
- Doesn't block any functionality
- Save/load feature will provide this implicitly

---

## 📅 Phased Roadmap

### 🏃 **Phase 1: Core Usability** (Week 1) - *FOUNDATION*
**Goal:** Make the app actually usable for basic goal breakdown

| Stream | Feature | Effort | Value |
|--------|---------|--------|-------|
| Canvas | Spacebar + middle mouse panning | 2h | 🔥 Critical |
| Cards | Selection system + Delete | 3h | 🔥 Critical |
| Cards | Mark as complete (green + strikethrough) | 2h | 🔥 Critical |
| UX | Helper text system | 1h | 🔥 High |
| **Total** | **8 hours** | **All must-haves done** |

**Success Criteria:** Users can navigate, select, delete, and complete goals with visual feedback and guidance

---

### 🎯 **Phase 2: Power User Features** (Week 2) - *EFFICIENCY*
**Goal:** Make experienced users 10x faster

| Stream | Feature | Effort | Value |
|--------|---------|--------|-------|
| Keyboard | Tab for child, Enter for sibling | 3h | 🔥 High |
| Keyboard | Escape to deselect, Delete to remove | 1h | 🔥 High |
| Data | Auto-save to localStorage | 4h | 🔥 Critical |
| Data | Load previous projects menu | 3h | 🔥 Critical |
| **Total** | **11 hours** | **Core feature complete** |

**Success Criteria:** Power users never need mouse, work persists between sessions

---

### 💎 **Phase 3: Polish & Professional** (Week 3) - *DELIGHT*
**Goal:** Make it look and feel professional

| Stream | Feature | Effort | Value |
|--------|---------|--------|-------|
| Visual | 90-degree connectors | 4h | 💎 High |
| Visual | Better arrow heads | 2h | 💎 Medium |
| Visual | Canvas background polish | 1h | 💎 Medium |
| Bugs | Fix any Phase 1-2 issues | 3h | 🔥 Critical |
| **Total** | **10 hours** | **Production ready** |

**Success Criteria:** App looks professional, ready to share with others

---

### 🚀 **Phase 4: Scale & Advanced** (Week 4+) - *OPTIONAL*
**Goal:** Handle edge cases and advanced users

| Stream | Feature | Effort | Value |
|--------|---------|--------|-------|
| Canvas | Zoom in/out feature | 5h | 💡 Medium |
| Canvas | Fit to screen button | 2h | 💡 Medium |
| Cards | Priority system (High/Med/Low) | 6h | 💡 Medium |
| Data | Export to JSON/PNG | 4h | 💡 Low |
| **Total** | **17 hours** | **Nice to haves** |

**Success Criteria:** App handles 100+ goal trees smoothly

---

## 🎯 Immediate Next Actions

### **This Session:**
1. ✅ Clean up archives (DONE)
2. ✅ Update .gitignore (DONE)
3. ⬜ Integrate CanvasManager for panning (30 min)
4. ⬜ Add selection system (1 hour)

### **Next Session:**
1. Add delete & complete functionality
2. Integrate helper text system
3. Test Phase 1 thoroughly

---

## 📊 Decision Framework

**When evaluating new features, ask:**
1. **User Value:** Does this solve a real pain point? (Not just "nice to have")
2. **Feasibility:** Can we build it in <8 hours? (Otherwise defer)
3. **Simplicity:** Does it fit the "stupid simple" philosophy? (No feature bloat)
4. **80/20:** Will 80%+ of users benefit from this? (No niche features)

**If answer is "no" to any → Move to COULD or WON'T**

---

## 💡 Key Principles

1. **One feature at a time** - Test each addition before moving on
2. **Stolen focus beats custom build** - Use patterns from archived PPTGoalBreaker
3. **No feature bloat** - Stay laser-focused on core problem: breaking down big goals
4. **Performance first** - Every feature must maintain 60fps smoothness
5. **Learning as we go** - You're building product management skills, not just an app

---

**Confidence: 9/10** - Based on deep analysis of current codebase, realistic effort estimates, and tight prioritization aligned with "stupid simple" philosophy
