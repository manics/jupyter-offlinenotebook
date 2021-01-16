import Dexie from 'dexie';
import { PartialJSONValue } from '@lumino/coreutils';

let _repoid: string = null;
let _repoLabel: string = null;
let _binderRefUrl: string = null;
let _binderPersistentUrl: string = null;
let db: OfflinenotebookDatabase = null;
const dbname = 'jupyter-offlinenotebook';

class OfflinenotebookDatabase extends Dexie {
  offlinenotebook: Dexie.Table<IOfflineNotebook, string>;

  constructor() {
    super(dbname);

    // Define tables and indexes
    this.version(1).stores({
      offlinenotebook: 'pk, repoid, name, type',
    });

    // The following lines are needed for it to work across typescipt using babel-preset-typescript:
    this.offlinenotebook = this.table('offlinenotebook');
  }
}

export interface IOfflineNotebook {
  pk: string;
  repoid: string;
  name: string;
  type: string;

  path?: string;
  format?: string;
  content?: PartialJSONValue;
}

interface IStringStringMap {
  [key: string]: string | undefined;
}

export function initialise(data: IStringStringMap): void {
  _repoid = data['repoid'];
  if (_repoid) {
    console.log('offline-notebook repoid: ' + _repoid);
  } else {
    console.log('offline-notebook repoid not found, disabled');
  }
  _repoLabel = data['binder_repo_label'] || 'Repo';
  console.log('offline-notebook repoLabel: ' + _repoLabel);
  _binderRefUrl = data['binder_ref_url'];
  console.log('offline-notebook binderRefUrl: ' + _binderRefUrl);
  _binderPersistentUrl = data['binder_persistent_url'];
  console.log('offline-notebook binderPersistentUrl: ' + _binderPersistentUrl);
}

function getDb(): OfflinenotebookDatabase {
  if (!db) {
    db = new OfflinenotebookDatabase();
    console.log('offline-notebook: Opened IndexedDB');
  }
  return db;
}

export function saveNotebook(
  path: string,
  nb: PartialJSONValue,
  success: Function,
  error: Function
): void {
  const primaryKey = 'repoid:' + _repoid + ' path:' + path;
  getDb()
    .offlinenotebook.put({
      pk: primaryKey,
      repoid: _repoid,
      name: path.replace(/.*\//, ''),
      path: path,
      format: 'json',
      type: 'notebook',
      content: nb,
    })
    .then((key) => success(key))
    .catch((e) => error(e));
}

export function loadNotebook(
  path: string,
  success: Function,
  error: Function
): void {
  const primaryKey = 'repoid:' + _repoid + ' path:' + path;
  getDb()
    .offlinenotebook.get(primaryKey)
    .then((key) => success(key))
    .catch((e) => error(e));
}

// Download https://jsfiddle.net/koldev/cW7W5/
export function downloadNotebookFromBrowser(
  name: string,
  nb: PartialJSONValue
): void {
  const blob = new Blob([JSON.stringify(nb)], {
    // https://jupyter.readthedocs.io/en/latest/reference/mimetype.html
    type: 'application/x-ipynb+json',
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  document.body.appendChild(a);
  a.href = url;
  a.style.display = 'none';
  a.download = name;
  console.log('offlinenotebook: ' + name, blob);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export function openBinderRepo(): void {
  const a = document.createElement('a');
  document.body.appendChild(a);
  a.href = _binderRefUrl;
  a.target = '_blank';
  a.style.display = 'none';
  a.click();
  document.body.removeChild(a);
}

export function repoid(): string {
  return _repoid;
}

export function repoLabel(): string {
  return _repoLabel;
}

export function binderRefUrl(): string {
  return _binderRefUrl;
}

export function binderPersistentUrl(): string {
  return _binderPersistentUrl;
}
