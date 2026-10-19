# Contributing to ShadowStream

We welcome contributions from cinema lovers, React Native developers, and cloud systems engineers around the globe!

## Development Quickstart

1. **Fork and clone the repository**:
   ```bash
   git clone https://github.com/muhdfaisalwork-gif/ShadowStream.git
   cd ShadowStream
   ```

2. **Run Web Client**:
   ```bash
   cd frontend
   npm install
   npm run web
   ```

3. **Run Catalog Edge Worker**:
   ```bash
   cd downloads/streamapp-worker
   npm install
   npx wrangler dev
   ```

## Architectural Guidelines
- **Zero Hardcoded Secrets**: Never commit Cloudflare API tokens, private provider keys, or credentials.
- **Failover First**: All video players must gracefully fall back across secondary resolvers before displaying an error.
- **Micro-Level Polish**: Ensure all UI buttons, chips, and overlays remain responsive across mobile viewports, landscape orientations, and desktop mice.
- **SEO & Community Standards**: Ensure all new routes include standard JSON-LD Schema and meta tags.

## Submitting a Pull Request
1. Branch off `main` (`git checkout -b feat/my-improvement`).
2. Commit with clean conventional commit messages.
3. Push to your fork and submit a PR against `main`.
