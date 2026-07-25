import { createWriteStream } from 'node:fs';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { globby } from 'globby';
import { ZipArchive } from 'archiver';

const rootDirectory = process.cwd();
const outputFile = 'luminous-sources.zip';
const includePatterns = ['**/*'];

async function createZip(): Promise<void> {
  const outputPath = path.resolve(rootDirectory, outputFile);

  await rm(outputPath, { force: true });

  const files = await globby(includePatterns, {
    cwd: rootDirectory,
    gitignore: true,
    dot: true,
    onlyFiles: true,
    followSymbolicLinks: false,
    ignore: [
      '.git/**',
      'node_modules/**',
      'dist/**',
      'release/**',
      'assets/**',
      outputFile,
    ],
  });

  if (files.length === 0) {
    throw new Error('Не найдено файлов для добавления в архив');
  }

  files.sort();

  const output = createWriteStream(outputPath);

  const archive = new ZipArchive({
    zlib: {
      level: 9,
    },
  });

  const archiveCompleted = new Promise<void>((resolve, reject) => {
    output.once('close', resolve);
    output.once('error', reject);
    archive.once('error', reject);

    archive.on('warning', (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') {
        console.warn(`Предупреждение: ${error.message}`);
        return;
      }

      reject(error);
    });
  });

  archive.pipe(output);

  for (const file of files) {
    archive.file(path.resolve(rootDirectory, file), {
      name: file,
    });
  }

  await archive.finalize();
  await archiveCompleted;

  const sizeInMb = archive.pointer() / 1024 / 1024;

  console.log(`Создан архив: ${outputFile}`);
  console.log(`Добавлено файлов: ${files.length}`);
  console.log(`Размер: ${sizeInMb.toFixed(2)} MB`);
}

createZip().catch((error: unknown) => {
  console.error('Не удалось создать архив');

  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }

  process.exitCode = 1;
});
