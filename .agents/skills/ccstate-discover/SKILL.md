---
name: ccstate-discover
description: Discover ccstate-related lint rules and skill updates from vm0 repo, compare with current project to find applicable updates
---

# ccstate Discover

Discover ccstate-related ESLint rules and skill documentation updates from the vm0 repository, compare with the current project, and identify applicable changes to sync.

## Trigger phrases

- sync ccstate
- check ccstate updates
- discover ccstate
- compare vm0 rules

## Steps

### 1. Fetch vm0's current ccstate ESLint rules

```bash
gh api "repos/vm0-ai/vm0/git/trees/main?recursive=1" --jq '.tree[].path' | grep "turbo/apps/platform/custom-eslint/rules/"
```

### 2. Fetch vm0's current ccstate skill content

```bash
gh api repos/vm0-ai/vm0/contents/.claude/skills/ccstate/SKILL.md --jq '.content' | base64 -d
```

### 3. Get this project's current rule list

Read `eslint-plugin/index.ts` to see all registered rules.

### 4. Compare differences

Compare vm0's rule list against this project's existing rules. Identify:

- **New rules**: rules that exist in vm0 but not in this project
- **Updated rules**: same-name rules whose implementation may have changed
- **New skill content**: patterns documented in vm0's skill but missing from this project's skill

### 5. Assess applicability

For each difference, evaluate:

- Does the rule/pattern apply to this project's architecture?
- Does it need adaptation (directory paths, utility names, etc.)?
- Are there conflicts or overlaps with existing rules?

### 6. Output a report

Present a comparison report in this format:

```
## New Rules

| Rule | Description | Applicable | Notes |
|------|-------------|:---:|-------|
| ... | ... | ✅/⚠️/❌ | ... |

## Skill Content Updates

| Section | Change | Applicable | Notes |
|---------|--------|:---:|-------|
| ... | ... | ✅/⚠️/❌ | ... |

## Recommended Actions

1. ...
2. ...
```

### 7. Wait for user confirmation before executing

After the report is complete, ask the user which updates to sync. Only execute changes after confirmation.

## Notes

- vm0's rules are in `turbo/apps/platform/custom-eslint/rules/` (ccstate-related) and `turbo/apps/api/custom-eslint/rules/` (backend)
- This project's rules are in `eslint-plugin/`
- vm0 uses `src/signals/` and `src/views/` directory layout — this project uses the same structure
- Path adaptation: vm0 uses `../utils.ts` for createRule, this project uses `./utils.ts`
- When adding rules, follow this project's code style: no semicolons, single quotes, `export const` (not default export)
