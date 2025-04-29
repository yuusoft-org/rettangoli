import { existsSync } from 'node:fs';
import { rm, cp } from 'node:fs/promises';

const goldDir = './viz/gold/screenshots';
const artifactsDir = './viz/_site/artifacts/screenshots';

/**
 * Accepts artifacts as the new gold standard by removing the existing gold
 * directory and copying the artifacts directory to gold.
 */
async function acceptGold() {
  console.log('Accepting artifacts as new gold standard...');

  // Check if artifacts directory exists
  if (!existsSync(artifactsDir)) {
    console.error('Error: Artifacts directory does not exist!');
    process.exit(1);
  }

  try {
    // Remove gold directory if it exists
    if (existsSync(goldDir)) {
      console.log('Removing existing gold directory...');
      await rm(goldDir, { recursive: true, force: true });
    }

    // Wait for 100ms to ensure the directory is removed
    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    })
    // // Create gold directory if it doesn't exist
    // Copy artifacts to gold
    console.log('Copying artifacts to gold...');
    await cp(artifactsDir, goldDir, { recursive: true });

    console.log('Done! New gold standard accepted.');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

export default acceptGold;
