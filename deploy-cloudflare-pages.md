# Deploy To Cloudflare Pages

Target domain: `www.geeknexus.ai`

## Option A: Dashboard Upload

1. Open Cloudflare Dashboard.
2. Go to **Workers & Pages**.
3. Create a new **Pages** project.
4. Choose **Direct Upload**.
5. Upload the contents of this folder:
   - `index.html`
   - `styles.css`
   - `assets/hero.png`
   - `assets/hero.webp`
6. After deployment succeeds, add custom domain:
   - `www.geeknexus.ai`
7. Let Cloudflare create the DNS record automatically.

## Option B: GitHub Connected Deploy

1. Create a GitHub repository, for example `geeknexus-site`.
2. Push this folder.
3. In Cloudflare Pages, connect the GitHub repository.
4. Build settings:
   - Framework preset: None
   - Build command: leave blank
   - Output directory: `/`
5. Add custom domain `www.geeknexus.ai`.

## DNS

Cloudflare Pages normally creates the needed DNS record automatically.

If doing it manually:

- Type: CNAME
- Name: `www`
- Target: the Cloudflare Pages project hostname
- Proxy: enabled

