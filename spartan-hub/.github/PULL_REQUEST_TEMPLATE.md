# Pull Request Template

## Description
<!-- Please include a summary of the changes and the related issue. Please also include relevant motivation and context. -->

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Security patch
- [ ] Documentation update
- [ ] Configuration change
- [ ] Performance improvement

## Security Impact Assessment
<!-- ⚠️ MANDATORY: Complete the security checklist before merging -->
Please verify all items in the [Security Checklist](./PULL_REQUEST_SECURITY_CHECKLIST.md):

### Security Checklist Verification:
- [ ] Input validation and sanitization implemented
- [ ] Authentication/authorization properly enforced
- [ ] Dependencies verified (0 critical vulnerabilities)
- [ ] Type safety maintained (no 'any' types in critical paths)
- [ ] Error handling prevents information disclosure
- [ ] Configuration security validated
- [ ] No hardcoded credentials or secrets

## Testing
- [ ] Unit tests pass (`npm test`)
- [ ] Security scan passes (`npm audit --audit-level=critical`)
- [ ] TypeScript compilation successful (`npx tsc --noEmit`)
- [ ] Code coverage meets requirements (80% for security components)
- [ ] Manual testing completed
- [ ] Cross-browser/device testing (if applicable)

## Code Quality
- [ ] Follows project coding standards
- [ ] Proper documentation added/updated
- [ ] No generated files or coverage reports included
- [ ] Commit messages follow conventional format
- [ ] Changes are focused and atomic

## Deployment Impact
- [ ] Backward compatible
- [ ] Database migrations included (if applicable)
- [ ] Environment variables documented
- [ ] Rollback procedure defined
- [ ] Monitoring alerts configured

## Review Requirements
<!-- ⚠️ MANDATORY: These must be completed before merging -->
- [ ] At least 1 team member approval received
- [ ] Security checklist fully verified by reviewer
- [ ] All automated checks pass
- [ ] No critical/blocker issues identified

## Related Issues
<!-- Link any related issues using keywords like "Fixes #123" or "Closes #456" -->

## Screenshots/Recordings
<!-- If applicable, add screenshots or recordings to help explain your changes -->

## Additional Context
<!-- Add any other context about the pull request here -->

---
**Reviewer Notes:**
- [ ] Security checklist verified ✓
- [ ] Code quality standards met ✓
- [ ] Testing requirements satisfied ✓
- [ ] Ready for merge ✓

**Approving Reviewer:** _____________________
**Date:** _____________________