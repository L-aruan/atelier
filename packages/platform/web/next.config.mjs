/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@atelier/ui-kit',
    '@atelier/types',
    '@atelier/engine-image',
    '@atelier/engine-ai',
    '@atelier/tool-image-compress',
    '@atelier/tool-image-crop',
    '@atelier/tool-image-format',
    '@atelier/tool-ai-remove-bg',
  ],
};
export default nextConfig;
