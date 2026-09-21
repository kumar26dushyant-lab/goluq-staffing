import { Config } from "@remotion/cli/config";

// The site's own images (public/catalog, public/story, ...) are the assets:
// staticFile("catalog/aff_boss.jpg") resolves against the site's public dir.
Config.setPublicDir("../public");
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
