import { PartialJSONValue } from "@lumino/coreutils";

export function initialise(data: JSON): null;
export function saveNotebook(path: string, nb: PartialJSONValue, success: CallableFunction, error: CallableFunction)
export function loadNotebook(path: string, success: CallableFunction, error: CallableFunction)
export function downloadNotebookFromBrowser(name: string, nb: PartialJSONValue): null;
export function openBinderRepo(): null;

export function repoid(): string;
export function repoLabel(): string;
export function binderRefUrl(): string;
export function binderPersistentUrl(): string;

