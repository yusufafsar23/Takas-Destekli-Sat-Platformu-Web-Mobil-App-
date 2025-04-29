// CommonJS formatında polyfill içe aktarma
const webStreamsPolyfill = require('web-streams-polyfill');
const { ReadableStream } = webStreamsPolyfill;

// Global ReadableStream'i polyfill ile değiştir
global.ReadableStream = ReadableStream;

// Export for potential usage elsewhere
module.exports = { ReadableStream };

// ReadableStream polyfill için boş bir yerleşik (placeholder) implementasyon
// Bu şekilde kodun çalışmasını engellemeyecek basit bir polyfill

// Boş bir readableStream
if (typeof global.ReadableStream === 'undefined') {
  global.ReadableStream = function() {};
}

module.exports = {}; 