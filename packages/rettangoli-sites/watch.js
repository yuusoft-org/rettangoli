// Watch mode for development
import { watchSite } from './src/cli/index.js';

watchSite().catch(console.error);