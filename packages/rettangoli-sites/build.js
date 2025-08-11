#!/usr/bin/env node

// Legacy build.js - redirects to the new CLI
import { buildSite } from './src/cli/build.js';

buildSite().catch(console.error);