# Example PR Review Output with Clustering

This shows how the AI PR review will look with the clustering feature enabled.

## Before Clustering (Old Behavior)

```
## 🤖 AI Senior Review

### Security Reviewer

🔴 **HIGH**: Logs recipient email addresses (PII exposure)
   📄 `client.py:111`
   💡 Remove email logging or redact PII

🔴 **HIGH**: Logs recipient email addresses (PII exposure)
   📄 `client.py:158`
   💡 Remove email logging or redact PII

🔴 **HIGH**: Returns None on failure (should raise exception)
   📄 `storage.py:73`
   💡 Raise exception instead of returning None

### Reliability Reviewer

🟡 **MEDIUM**: Missing error handling for network timeout
   📄 `api.py:45`
   💡 Add try-catch for timeout errors

🟡 **MEDIUM**: Missing error handling for network failures
   📄 `api.py:67`
   💡 Add try-catch for network errors
```

**Issues:** Duplicate/similar findings are shown separately, cluttering the review.

---

## After Clustering (New Behavior)

```
## 🤖 AI Senior Review

### Security Reviewer

🔴 **HIGH**: Logs recipient email addresses (PII exposure)
   📄 Found in 2 locations:
      - `client.py:111`
      - `client.py:158`
   💡 Remove email logging or redact PII

🔴 **HIGH**: Returns None on failure (should raise exception)
   📄 `storage.py:73`
   💡 Raise exception instead of returning None

### Reliability Reviewer

🟡 **MEDIUM**: Missing error handling for network timeout
   📄 Found in 2 locations:
      - `api.py:45`
      - `api.py:67`
   💡 Add try-catch for timeout errors

---
_This is an automated, non-blocking review. Human review is still required._
_Posted at 14:23 UTC • Edit #1_
```

**Benefits:**
- Similar findings are unified into one comment with multiple locations
- Reduced noise - 5 findings → 3 clusters
- Easier to understand the actual issues at a glance
- Action items are clearer (fix the same issue in N places)
- Timestamp shows when the review was posted (UTC timezone)
- Edit counter tracks how many times the PR has been updated and re-reviewed

---

## How It Works

The clustering algorithm:

1. **Groups similar findings** using string similarity (Jaccard similarity on words)
2. **Requires same reviewer + severity** to cluster together
3. **Compares both message and suggestion text** 
4. **Uses 60% similarity threshold** - balances false positives/negatives
5. **Deduplicates exact same file:line locations** within a cluster

### Example Clustering Rules

✅ **Will cluster together:**
- "Logs recipient email addresses (PII)" at lines 111 and 158
- "Missing error handling for timeout" and "Missing error handling for failures"
- "SQL injection risk in query" at multiple locations

❌ **Will NOT cluster together:**
- Different reviewers (security vs. reliability)
- Different severity levels (high vs. medium)
- Completely different messages (<60% similarity)
