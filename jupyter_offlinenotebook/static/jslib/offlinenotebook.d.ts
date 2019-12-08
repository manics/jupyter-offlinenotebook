import { JSONValue } from "@phosphor/coreutils";

export function initialise(data: JSON): null;
export function saveNotebook(path: string, nb: JSONValue, success: CallableFunction, error: CallableFunction)
export function loadNotebook(path: string, success: CallableFunction, error: CallableFunction)
export function downloadNotebookFromBrowser(name: string, nb: JSONValue): null;
export function openBinderRepo(): null;

export function repoid(): string;
export function repoLabel(): string;
export function binderRefUrl(): string;
export function binderPersistentUrl(): string;

