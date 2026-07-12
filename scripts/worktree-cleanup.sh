#!/bin/bash
# Worktree cleanup script
# Removes worktrees for branches that have been merged or deleted

set -e

echo "=== Git Worktree Cleanup ==="
echo ""

# Get list of worktrees (skip the main one)
worktrees=$(git worktree list --porcelain | grep -A2 "^worktree" | grep -v "^$")

# Parse worktrees
current_worktree=""
current_branch=""
to_remove=()

while IFS= read -r line; do
    if [[ "$line" =~ ^worktree ]]; then
        current_worktree="${line#worktree }"
    elif [[ "$line" =~ ^branch ]]; then
        current_branch="${line#branch refs/heads/}"

        # Skip the main worktree
        if [[ "$current_worktree" == "$(git rev-parse --show-toplevel)" ]]; then
            continue
        fi

        # Check if branch still exists
        if ! git show-ref --verify --quiet "refs/heads/$current_branch" 2>/dev/null; then
            echo "⚠  Stale worktree (branch deleted): $current_branch"
            echo "   Path: $current_worktree"
            to_remove+=("$current_worktree")
        # Check if branch is merged to main
        elif git merge-base --is-ancestor "$current_branch" main 2>/dev/null; then
            echo "✓  Merged worktree: $current_branch"
            echo "   Path: $current_worktree"
            to_remove+=("$current_worktree")
        else
            echo "○  Active worktree: $current_branch"
            echo "   Path: $current_worktree"
        fi
        echo ""
    fi
done <<< "$worktrees"

# Confirm and remove
if [ ${#to_remove[@]} -gt 0 ]; then
    echo "=== Found ${#to_remove[@]} worktree(s) to clean up ==="
    echo ""

    for wt in "${to_remove[@]}"; do
        echo "Removing: $wt"
        git worktree remove "$wt" --force || echo "  Warning: Failed to remove, might need manual cleanup"
    done

    echo ""
    echo "✓ Cleanup complete!"
else
    echo "No worktrees to clean up."
fi

# Prune any stale worktree references
echo ""
echo "=== Pruning stale worktree references ==="
git worktree prune -v
