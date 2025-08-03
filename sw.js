// A name for the cache - change this when you update files
const CACHE_NAME = 'quad-core-cogitator-v1';

// A list of all the files the app needs to work offline
const FILES_TO_CACHE = [
  'index.html',
  'style.css',
  'script.js'
];

// When the service worker is installed, open the cache and add the files
self.addEventListener('install', (evt) => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Pre-caching offline page');
      return cache.addAll(FILES_TO_CACHE);
    })
  );
});

// When the app makes a request (e.g., for a file), serve it from the cache first
self.addEventListener('fetch', (evt) => {
  evt.respondWith(
    caches.match(evt.request).then((response) => {
      // If the file is in the cache, return it. Otherwise, fetch it from the network.
      return response || fetch(evt.request);
    })
  );
});