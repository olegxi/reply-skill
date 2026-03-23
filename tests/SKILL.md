---
name: reply-skill-test
description: Test the Reply.io skill — runs integration tests against the live API, creates and cleans up test data
user-invocable: true
---

# Reply Skill Test

Runs integration tests against the Reply.io API to verify the Reply skill is working correctly.

## On Invocation

1. Run the test suite:
   ```
   cd "$SKILL_DIR" && npx tsx scripts/run-tests.ts
   ```

2. Read the output and present the results to the user:
   - Show the pass/fail count
   - If any tests failed, explain what failed and suggest fixes
   - If all tests passed, confirm the Reply skill is healthy

3. The test script:
   - Tests API connectivity and authentication
   - Lists email accounts, schedules, campaigns, contacts (read-only)
   - Verifies campaign step retrieval and stats computation
   - Performs a full Contact CRUD cycle (create → search → verify → delete)
   - Cleans up all test data it creates (uses unique timestamped email addresses)
   - Respects API rate limits (waits between throttled endpoints)

## Notes

- The API key is loaded from `.env` (REPLY_API_KEY), same as the Reply skill
- Test contacts use `replytest+TIMESTAMP@test-skill.invalid` — guaranteed unique and cleaned up
- The test takes ~20 seconds due to API throttle waits
- Exit code 0 = all passed, exit code 1 = failures
