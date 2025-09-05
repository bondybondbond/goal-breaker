# Task Completion Checklist

## When Feature Development is Complete

### 1. Test Functionality
- [ ] Test in development mode (`npm start`)
- [ ] Verify all new features work as expected
- [ ] Test both canvas and list views
- [ ] Check responsive behavior on mobile

### 2. Code Quality
- [ ] Ensure TypeScript compilation passes (no errors)
- [ ] Verify all imports/exports are correct
- [ ] Check for unused variables/functions
- [ ] Ensure proper error handling

### 3. Update Documentation
- [ ] Update `docs/AI_PROJECT_STATE.md` with new working features
- [ ] Update `docs/FEATURE_MOSCOW.md` completion status
- [ ] Add session notes to `docs/DEVELOPMENT_LOG.md`
- [ ] Update `docs/QUICK_REF.md` with new function locations

### 4. Git Workflow
```bash
git add .
git commit -m "feat: [description of changes]"
git push origin main
```

### 5. Build & Deploy Verification
```bash
npm run build    # Verify production build works
```

## Documentation Updates Required
Each successful milestone should update:
- **AI_PROJECT_STATE.md**: Current feature status
- **DEVELOPMENT_LOG.md**: Session summary with technical details  
- **FEATURE_MOSCOW.md**: Move completed items to ✅ status
- **QUICK_REF.md**: Add any new important functions/locations