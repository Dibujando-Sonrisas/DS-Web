import type { NextConfig } from "next";

type ImagesConfig = NonNullable<NextConfig["images"]>;

const PRIVATE_HOST =
  /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[::1\]$)/;

// Only public Storage objects of this project's Supabase are optimized. The
// optimizer refuses private addresses (dangerouslyAllowLocalIP), so with a
// local Supabase, as on the offline server, images are served as they are.
function imagesConfig(): ImagesConfig {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return {};
  const { protocol, hostname, port } = new URL(supabaseUrl);
  return {
    remotePatterns: [
      {
        protocol: protocol === "http:" ? "http" : "https",
        hostname,
        port,
        pathname: "/storage/v1/object/public/**",
        search: "",
      },
    ],
    unoptimized:
      process.env.NEXT_PUBLIC_MODO_OFFLINE === "1" ||
      PRIVATE_HOST.test(hostname),
  };
}

const nextConfig: NextConfig = {
  images: imagesConfig(),
};

export default nextConfig;
