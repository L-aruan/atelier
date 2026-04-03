/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@mediabox/ui-kit',
    '@mediabox/types',
    '@mediabox/engine-image',
    '@mediabox/tool-image-compress',
    '@mediabox/tool-image-crop',
    '@mediabox/tool-image-format',
  ],
};
export default nextConfig;
