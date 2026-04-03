/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@mediabox/ui-kit',
    '@mediabox/types',
    '@mediabox/engine-image',
    '@mediabox/engine-ai',
    '@mediabox/tool-image-compress',
    '@mediabox/tool-image-crop',
    '@mediabox/tool-image-format',
    '@mediabox/tool-ai-remove-bg',
  ],
};
export default nextConfig;
