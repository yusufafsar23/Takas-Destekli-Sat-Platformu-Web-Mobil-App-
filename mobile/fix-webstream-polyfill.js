// Bu dosya, Node.js ve Expo SDK 52 arasındaki web streams API uyumsuzluğunu giderir
const { ReadableStream: PolyfilledReadableStream } = require('web-streams-polyfill');

// Global ReadableStream'i polyfill ile değiştir
global.ReadableStream = PolyfilledReadableStream;

console.log('Web Streams API polyfill uygulandı');

module.exports = {
  ReadableStream: PolyfilledReadableStream
}; 