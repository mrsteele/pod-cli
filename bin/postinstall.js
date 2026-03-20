#!/usr/bin/env node
/**
 * Postinstall script for pod CLI
 * Runs interactive setup after npm install
 */

import { postinstallSetup } from '../dist/commands/config-wizard.js';

postinstallSetup().catch(() => {
  // Silently fail - postinstall should not block installation
});
