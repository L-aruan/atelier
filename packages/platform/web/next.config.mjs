/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@mediabox/ui-kit',
    '@mediabox/types',
    '@mediabox/engine-image',
    '@mediabox/tool-image-crop',
  ],
};
export default nextConfig;
