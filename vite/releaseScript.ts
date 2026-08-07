import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const distDirectory = path.join(projectRoot, 'dist');
const releaseDirectory = path.join(projectRoot, 'release');
const stagingDirectory = path.join(projectRoot, '.release-tmp');
const colorSchemeFile = path.join(projectRoot, 'src', 'color.ini');
const manifestFile = path.join(projectRoot, 'manifest.json');
const packageFile = path.join(projectRoot, 'package.json');

if (!fs.existsSync(distDirectory)) {
  throw new Error(
    'dist directory does not exist. Run the build before release.',
  );
}

fs.rmSync(stagingDirectory, { recursive: true, force: true });

try {
  fs.cpSync(distDirectory, stagingDirectory, { recursive: true });
  fs.copyFileSync(colorSchemeFile, path.join(stagingDirectory, 'color.ini'));
  fs.rmSync(releaseDirectory, { recursive: true, force: true });
  fs.renameSync(stagingDirectory, releaseDirectory);
} catch (error) {
  fs.rmSync(stagingDirectory, { recursive: true, force: true });
  throw error;
}

const version = syncManifestVersion();
attemptGitCommit(version);

function syncManifestVersion(): string {
  const packageJson = JSON.parse(fs.readFileSync(packageFile, 'utf8')) as {
    version: string;
  };
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8')) as {
    usercss: string;
    include: string[];
  };

  manifest.usercss = setVersionQuery(manifest.usercss, packageJson.version);
  manifest.include = manifest.include.map((url) =>
    setVersionQuery(url, packageJson.version),
  );

  fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  return packageJson.version;
}

function attemptGitCommit(version: string): void {
  const add = spawnSync('git', ['add', '-A'], {
    cwd: projectRoot,
    stdio: 'inherit',
  });

  if (add.error || add.status !== 0) {
    console.warn(
      `[release] Could not stage release changes for git commit ${version}.`,
    );
    return;
  }

  const stagedDiff = spawnSync('git', ['diff', '--cached', '--quiet'], {
    cwd: projectRoot,
    stdio: 'ignore',
  });

  if (stagedDiff.status === 0) {
    console.info(`[release] No staged changes to commit for ${version}.`);
    return;
  }

  if (stagedDiff.error || stagedDiff.status !== 1) {
    console.warn(
      `[release] Could not inspect staged changes before commit ${version}.`,
    );
    return;
  }

  const commit = spawnSync('git', ['commit', '-m', version], {
    cwd: projectRoot,
    stdio: 'inherit',
  });

  if (commit.error || commit.status !== 0) {
    console.warn(`[release] Git commit ${version} was not created.`);
    return;
  }

  console.info(`[release] Created git commit ${version}.`);
}

function setVersionQuery(url: string, version: string): string {
  const parsed = new URL(url);
  parsed.searchParams.set('version', version);
  return parsed.toString();
}
