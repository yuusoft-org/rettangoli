
import rtglMarkdown from './src/rtglMarkdown.js';

export default {
  mdRender: rtglMarkdown,

  // Example custom functions that can be used in jempl templates
  functions: {
    // Convert string to uppercase
    uppercase: (str) => String(str).toUpperCase(),

    // Format date in different styles
    formatDate: (date, format = 'short') => {
      const d = new Date(date);
      if (format === 'short') {
        return d.toLocaleDateString();
      } else if (format === 'long') {
        return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      }
      return d.toString();
    },

    // Join array elements with separator
    join: (arr, separator = ', ') => Array.isArray(arr) ? arr.join(separator) : String(arr),
  }
}

