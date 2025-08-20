export default {
  functions: {
    // String functions
    uppercase: (str) => String(str).toUpperCase(),
    lowercase: (str) => String(str).toLowerCase(),
    capitalize: (str) => {
      const s = String(str);
      return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    },
    truncate: (str, length = 20) => {
      const s = String(str);
      return s.length > length ? s.substring(0, length) + '...' : s;
    },
    
    // Math functions
    add: (a, b) => Number(a) + Number(b),
    multiply: (a, b) => Number(a) * Number(b),
    round: (num, decimals = 0) => Number(num).toFixed(decimals),
    
    // Date function
    formatDate: (date, format = 'short') => {
      const d = new Date(date);
      if (format === 'short') {
        return d.toLocaleDateString();
      } else if (format === 'long') {
        return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      }
      return d.toString();
    },
    
    // Array functions
    join: (arr, separator = ', ') => Array.isArray(arr) ? arr.join(separator) : String(arr),
    first: (arr) => Array.isArray(arr) ? arr[0] : arr,
    last: (arr) => Array.isArray(arr) ? arr[arr.length - 1] : arr,
    
    // Utility function
    default: (value, defaultValue) => value == null || value === '' ? defaultValue : value,
    
    // Custom business logic
    calculateTotal: (items) => {
      if (!Array.isArray(items)) return 0;
      return items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);
    },
    formatCurrency: (amount) => {
      return '$' + Number(amount).toFixed(2);
    }
  }
}