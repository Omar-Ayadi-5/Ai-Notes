# Security

Please report a vulnerability privately through the repository's **Security → Report a vulnerability** feature if it is enabled. Do not include secrets, exploit details, or personal note contents in public issues.

## Operating the app

- Generate a unique signing secret. The backend rejects missing, short, and known placeholder secrets.
- Keep `.env` files and provider/database credentials private. Templates are the only environment files intended for Git.
- Use HTTPS, private database access, and trusted proxy configuration.
- New passwords use Argon2. Legacy bcrypt hashes are upgraded on successful login; input over 72 bytes is never truncated for legacy verification.
- JWT verification only accepts HS256 and requires `exp` and `sub`.
- Every private note action checks ownership. Sharing publishes note contents and the author's display name to anyone holding the link.
- Unsharing removes the token. Re-sharing issues a new token.
- Account/note APIs require MongoDB. Limits fail closed when its counters are unavailable.

## Limits

- Signup: 5 requests per client address per hour.
- Login: 15 requests per client address per minute.
- Note APIs: 120 requests per account per minute.
- AI analysis: 5 requests per account per minute, also counted in the note limit.
- Public shared-note reads: 60 requests per client address per minute.
- Fixed windows reset on the boundary. Rate-limit responses include `Retry-After`.
- Default request body maximum: 256 KiB. Content: 50,000 characters; title: 200; category: 60; tags: 30 entries of at most 50 characters.

Counters are shared in MongoDB and expire through a TTL index. They do not replace host-level DDoS protection, quotas, monitoring, or provider spending limits.

## Known limitations

Browser sessions use local storage. A same-origin script compromise could access them. Logout removes the browser token; tokens are stateless and remain valid until expiry or a signing-key rotation. Password reset and email verification are not implemented.

Unsaved drafts are memory-only and are not recoverable after a tab is closed. A warning is shown before leaving with unsaved changes.

External AI analysis transmits the title and up to 4,000 content characters to the configured provider. Avoid sensitive notes unless the provider's terms and data handling meet your needs.

Git commit author emails remain in published history. Configure a GitHub noreply address for future commits if desired; this project does not rewrite existing public history.

## Verification

CI includes ownership and JWT tests, request-limit checks, share-revocation tests, dependency audits, and Gitleaks scanning. These checks reduce risk but do not establish that a particular hosted deployment is configured securely.
