# Security Policy

## Reporting a vulnerability

**Do not open a public issue or pull request for a security problem.** Public disclosure before a fix is available puts users at risk.

Instead, report it privately via one of:

1. **GitHub private vulnerability report** — the [Security tab](../../security/advisories/new) on this repo. This is the preferred channel.
2. **Email** — `security@forkaround.io`. Please include:
   - A description of the issue and what it can do
   - Steps to reproduce (code, commands, or video)
   - The affected version(s) of the app or commit SHA
   - Your name or handle for credit (optional)

Please do **not** test against production infrastructure (forkit-backend.vercel.app, live app store builds) in ways that could affect real users — rate-limit abuse, data corruption, DoS. Local reproduction on your own build is preferred.

---

## Response expectations

This is a solo-maintained project, so please be patient:

- Initial acknowledgement: within 5 business days
- Triage and severity assessment: within 10 business days
- Fix timeline: depends on severity
  - Critical (credential exposure, auth bypass, RCE): target 7 days
  - High (data leak, privilege escalation): target 14 days
  - Medium / Low: target 30 days

I'll keep you updated through disclosure. If a fix ships, you'll be credited in the release notes unless you ask otherwise.

---

## Scope

**In scope:**
- Vulnerabilities in the source code in this repository
- Client-side issues in the published mobile apps that originate from code in this repo
- Secret/credential leakage in the repo or its history

**Out of scope (not security issues — file as a [regular feedback issue](https://github.com/CherrelleTucker/forkit-feedback/issues) instead):**
- Functional bugs without a security impact
- Missing best-practice headers on marketing pages
- Self-XSS that requires social-engineering the user into pasting code into their console
- Known limitations documented in the README, CLAUDE instructions, or case study
- Third-party service issues (Google Places API, Vercel, Apple/Google store policies) — report those to the vendor

**Closed-source components are not in scope for this repo.** The backend, curated data, and signing infrastructure are private and not part of this public code. Vulnerabilities in those should still be reported via `security@forkaround.io`.

---

## Safe harbor

Good-faith security research done within the scope above is welcomed. I won't pursue legal action or report to law enforcement for research that:

- Respects the out-of-scope list (especially: no testing against live production that affects real users)
- Makes a good-faith effort to avoid privacy violations, data destruction, and service degradation
- Gives reasonable time for a fix before public disclosure
- Doesn't exfiltrate user data beyond what's needed to demonstrate the issue

---

Thank you for helping keep ForkIt! and its users safe.
