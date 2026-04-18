# Contributing to ForkIt!

Thanks for taking a look. This is a single-maintainer project, so please read before opening a PR — it saves us both time.

---

## Looking for something to work on?

Browse open issues in the feedback tracker: **[CherrelleTucker/forkit-feedback](https://github.com/CherrelleTucker/forkit-feedback/issues)**. That's where user-reported bugs and feature requests live. Anything tagged `bug` or `enhancement` is fair game — just leave a quick comment claiming it before you start so we don't duplicate work.

---

## Before you start

- **Bug reports and feature requests don't go here.** File them at [CherrelleTucker/forkit-feedback](https://github.com/CherrelleTucker/forkit-feedback/issues) — that's the public tracker where non-developers can file too.
- **Read the [Code of Conduct](./CODE_OF_CONDUCT.md).** One strike is fine, two gets you uninvited.
- **Read the [LICENSE](./LICENSE).** Contributions are accepted under PolyForm Noncommercial 1.0.0. If you submit a PR, you're agreeing your contribution can be distributed under those terms.
- **Know what's in scope.** This repo is the React Native client only. The backend, curated chain/cuisine data, paywall logic that touches store APIs, and web landing pages are closed-source and not accepting contributions.

---

## In scope

- UI/UX fixes (layout, accessibility, dark-mode consistency, haptic feedback)
- Bug fixes in client-side logic
- Client-side performance improvements
- Test coverage for untested client code
- Platform compatibility (iOS ↔ Android parity issues)
- Refactors that simplify or clarify existing code
- Documentation improvements

## Out of scope

- Backend changes (the backend isn't in this repo)
- New curated data (chain lists, cuisine keywords — these are maintained separately)
- Changes to the paywall / IAP gating logic (store compliance risk)
- New third-party SDKs or analytics (privacy posture is deliberate)
- Build / signing / release automation
- Anything that would require new API keys or paid services to build

If you're unsure whether an idea is in scope, open a [feedback issue](https://github.com/CherrelleTucker/forkit-feedback/issues) *before* writing code to check.

---

## Development setup

See [README.md → Running locally](./README.md#running-locally). You'll need a `.env` file with `EXPO_PUBLIC_BACKEND_URL` pointing at a reachable backend. Without one, network features won't return real results, but the UI is fully navigable for styling and layout work.

---

## Workflow

1. **Fork and branch.** Branch off `main` with a descriptive name: `fix/tour-step-5-overflow`, `chore/dedupe-theme-constants`.
2. **Keep PRs small and focused.** One logical change per PR. If it spans more than ~400 lines of diff or touches more than 3–4 directories, split it.
3. **Run the review suite.** Before you push:
   ```bash
   npm run review
   ```
   All seven checks must pass. Auto-fix what's auto-fixable with `npm run review:fix`. If a rule is genuinely wrong for your change, raise it in the PR rather than silencing it locally.
4. **Run the tests.** `npm test` — green is required. Add tests for new logic.
5. **Write a commit message worth reading.** Format: `Topic: concise imperative`. Example: `Tour: fix step 5 overflow on small-screen devices`. No conventional-commits prefixes, no `feat:` / `fix:` — just the topic and what you did.
6. **Open the PR.** Link the feedback issue (if one exists), summarize what changed and why, and note what you tested on (simulator? physical device? which OS?).

---

## Secrets

The pre-commit hook runs [gitleaks](https://github.com/gitleaks/gitleaks) against staged changes and will block any commit that contains a recognized secret pattern. If you see `✗ Secret detected in staged changes — commit blocked`, remove the secret, re-stage, and retry. False positive? Add the fingerprint to `.gitleaksignore` in the same PR with a comment explaining why.

Never commit a real API key, even if it's "just for testing." Use `.env` (gitignored) and reference via `process.env.EXPO_PUBLIC_*`.

---

## Security vulnerabilities

Do not open a public issue or PR for anything that looks like a security problem. See [SECURITY.md](./SECURITY.md) for the private disclosure process.

---

## Review process

- I review PRs roughly weekly, sometimes faster, sometimes slower — this is a side project.
- Expect feedback on anything that adds scope beyond the stated change, diverges from existing patterns, or would impact store-review compliance.
- I will close without merging if a PR is out of scope (see list above), duplicates a feedback issue with no prior discussion, or was clearly generated without reading this file.

Thanks for helping make ForkIt! better.
