module.exports = {
  globDirectory: 'dist',
  globPatterns: ['**/*.{js,html,ttf,ico,json,png,jpg}'],
  globIgnores: ['_sitemap.html', '+not-found.html', '\\(tabs\\)/**'],
  swDest: 'dist/sw.js',
  importScripts: ['push-sw.js'],
  maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
  // Новая версия применяется при следующем запуске, без ручной очистки кэша.
  skipWaiting: true,
  clientsClaim: true,
};
