/**
 * Version checking utilities for pod CLI
 * Checks npm registry for newer versions
 */

import fs from 'fs-extra';
import path from 'path';
import { getConfigDir } from './config.js';

const PACKAGE_NAME = 'pod-cli';
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface VersionCheckCache {
  lastCheck: string;
  latestVersion: string;
}

/**
 * Get the version check cache file path
 */
function getVersionCachePath(): string {
  return path.join(getConfigDir(), '.version-check');
}

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get the current CLI version from package.json
 */
export async function getCurrentVersion(): Promise<string> {
  // Read from the package.json - try multiple locations
  const possiblePaths = [
    path.join(process.cwd(), 'package.json'),
    path.resolve(__dirname, '../../package.json'),
    path.resolve(__dirname, '../../../package.json')
  ];
  
  for (const packagePath of possiblePaths) {
    try {
      if (await fs.pathExists(packagePath)) {
        const content = await fs.readFile(packagePath, 'utf-8');
        const pkg = JSON.parse(content);
        if (pkg.name === 'pod-cli' && pkg.version) {
          return pkg.version;
        }
      }
    } catch {
      continue;
    }
  }
  
  return '0.1.0';
}

/**
 * Fetch the latest version from npm registry
 */
async function fetchLatestVersion(): Promise<string | null> {
  try {
    const response = await fetch(`https://registry.npmjs.org/${PACKAGE_NAME}/latest`, {
      headers: {
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json() as { version: string };
    return data.version;
  } catch {
    return null;
  }
}

/**
 * Read the version check cache
 */
async function readVersionCache(): Promise<VersionCheckCache | null> {
  const cachePath = getVersionCachePath();
  
  try {
    if (await fs.pathExists(cachePath)) {
      const content = await fs.readFile(cachePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch {
    // Ignore cache read errors
  }
  
  return null;
}

/**
 * Write the version check cache
 */
async function writeVersionCache(cache: VersionCheckCache): Promise<void> {
  const cachePath = getVersionCachePath();
  
  try {
    await fs.ensureDir(path.dirname(cachePath));
    await fs.writeJson(cachePath, cache);
  } catch {
    // Ignore cache write errors
  }
}

/**
 * Compare two semver versions
 * Returns true if version2 is newer than version1
 */
function isNewerVersion(version1: string, version2: string): boolean {
  const v1Parts = version1.split('.').map(Number);
  const v2Parts = version2.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const v1 = v1Parts[i] || 0;
    const v2 = v2Parts[i] || 0;
    
    if (v2 > v1) return true;
    if (v2 < v1) return false;
  }

  return false;
}

export interface VersionCheckResult {
  isOutdated: boolean;
  currentVersion: string;
  latestVersion: string | null;
}

/**
 * Check if the CLI is outdated
 * Only checks npm registry once per day
 */
export async function checkVersion(): Promise<VersionCheckResult> {
  const currentVersion = await getCurrentVersion();
  
  // Check cache first
  const cache = await readVersionCache();
  
  if (cache) {
    const lastCheck = new Date(cache.lastCheck).getTime();
    const now = Date.now();
    
    // If we checked within the last 24 hours, use cached result
    if (now - lastCheck < CHECK_INTERVAL_MS) {
      return {
        isOutdated: isNewerVersion(currentVersion, cache.latestVersion),
        currentVersion,
        latestVersion: cache.latestVersion
      };
    }
  }

  // Fetch latest version from npm
  const latestVersion = await fetchLatestVersion();
  
  if (latestVersion) {
    // Update cache
    await writeVersionCache({
      lastCheck: new Date().toISOString(),
      latestVersion
    });
    
    return {
      isOutdated: isNewerVersion(currentVersion, latestVersion),
      currentVersion,
      latestVersion
    };
  }

  // Couldn't fetch latest version
  return {
    isOutdated: false,
    currentVersion,
    latestVersion: null
  };
}

/**
 * Format the outdated warning message
 */
export function formatOutdatedWarning(result: VersionCheckResult): string {
  if (!result.isOutdated || !result.latestVersion) {
    return '';
  }

  return `⚠ pod CLI is out of date
Current: ${result.currentVersion}
Latest: ${result.latestVersion}
Run: npm update -g ${PACKAGE_NAME}`;
}
