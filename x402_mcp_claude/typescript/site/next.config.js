/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Disable ESLint during production builds in this example repo so the
    // build doesn't fail on developer-local formatting/line-ending differences.
    // You can remove/adjust this in production or if you prefer lint failures.
    ignoreDuringBuilds: true,
  },
};

// ESM export for projects using "type": "module" in package.json
export default nextConfig;
