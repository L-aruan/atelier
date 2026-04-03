/** Browser-side organizer: mirrors desktop organizer_engine.py (flat file list + ZIP output). */

export interface FileScanResult {
  fileCount: number;
  extGroups: Record<string, number>;
  nameGroups: number;
  duplicatedNames: number;
}

export interface FileMove {
  file: File;
  targetFolder: string;
  targetName: string;
}

function fileStem(fileName: string): string {
  const i = fileName.lastIndexOf('.');
  if (i <= 0) return fileName;
  return fileName.slice(0, i);
}

function fileExtKey(fileName: string): string {
  const i = fileName.lastIndexOf('.');
  if (i <= 0) return '(无后缀)';
  const ext = fileName.slice(i + 1).toLowerCase();
  return ext || '(无后缀)';
}

function typeFolderName(fileName: string): string {
  const i = fileName.lastIndexOf('.');
  if (i <= 0) return '其他';
  const ext = fileName.slice(i + 1).toLowerCase();
  return ext || '其他';
}

function allocatePath(
  folder: string,
  fileName: string,
  reserved: Set<string>,
): { targetFolder: string; targetName: string } {
  const rel = `${folder}/${fileName}`;
  if (!reserved.has(rel)) {
    reserved.add(rel);
    return { targetFolder: folder, targetName: fileName };
  }
  const dot = fileName.lastIndexOf('.');
  const stem = dot > 0 ? fileName.slice(0, dot) : fileName;
  const ext = dot > 0 ? fileName.slice(dot) : '';
  let counter = 1;
  for (;;) {
    const candidate = `${stem} (${counter})${ext}`;
    const path = `${folder}/${candidate}`;
    if (!reserved.has(path)) {
      reserved.add(path);
      return { targetFolder: folder, targetName: candidate };
    }
    counter += 1;
  }
}

export function scanFiles(files: File[]): FileScanResult {
  const extGroups: Record<string, number> = {};
  const stemCounts = new Map<string, number>();

  for (const f of files) {
    const extKey = fileExtKey(f.name);
    extGroups[extKey] = (extGroups[extKey] ?? 0) + 1;
    const stem = fileStem(f.name);
    stemCounts.set(stem, (stemCounts.get(stem) ?? 0) + 1);
  }

  let duplicatedNames = 0;
  for (const n of stemCounts.values()) {
    if (n >= 2) duplicatedNames += 1;
  }

  return {
    fileCount: files.length,
    extGroups,
    nameGroups: stemCounts.size,
    duplicatedNames,
  };
}

export function planByName(files: File[]): FileMove[] {
  const groups = new Map<string, File[]>();
  for (const f of files) {
    const stem = fileStem(f.name);
    const list = groups.get(stem);
    if (list) list.push(f);
    else groups.set(stem, [f]);
  }

  const moves: FileMove[] = [];
  const reserved = new Set<string>();

  const stems = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  for (const stem of stems) {
    const fileList = groups.get(stem)!;
    if (fileList.length < 2) continue;

    const sorted = [...fileList].sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase(), undefined, { sensitivity: 'base' }),
    );
    for (const f of sorted) {
      const { targetFolder, targetName } = allocatePath(stem, f.name, reserved);
      moves.push({ file: f, targetFolder, targetName });
    }
  }

  return moves;
}

export function planByType(files: File[]): FileMove[] {
  const sorted = [...files].sort((a, b) =>
    a.name.toLowerCase().localeCompare(b.name.toLowerCase(), undefined, { sensitivity: 'base' }),
  );

  const moves: FileMove[] = [];
  const reserved = new Set<string>();

  for (const f of sorted) {
    const folder = typeFolderName(f.name);
    const { targetFolder, targetName } = allocatePath(folder, f.name, reserved);
    moves.push({ file: f, targetFolder, targetName });
  }

  return moves;
}

export async function buildZip(moves: FileMove[]): Promise<Blob> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  for (const move of moves) {
    const data = await move.file.arrayBuffer();
    const path =
      move.targetFolder === '' ? move.targetName : `${move.targetFolder}/${move.targetName}`;
    zip.file(path, data);
  }
  return zip.generateAsync({ type: 'blob' });
}
