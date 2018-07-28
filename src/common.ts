import { files, Dropbox, Error } from '../node_modules/dropbox/src';
import { OperatorFunction } from '../node_modules/rxjs/internal/types';
import { Observable } from '../node_modules/rxjs';
import { reduce } from '../node_modules/rxjs/operators';

export function dumpToArray<T>(): OperatorFunction<T, T[]> {
	return (source: Observable<T>): Observable<T[]> => source.pipe(reduce<T, T[]>((n, e) => { n.push(e); return n; }, [] as T[]));
}

export type GetMetadataResult = (files.FileMetadataReference | files.FolderMetadataReference | files.DeletedMetadataReference);
export function dbx_filesListFolder(client: Dropbox, arg: files.ListFolderArg) {
	return new Observable<GetMetadataResult>((subs) => {
		function errHandler(err: Error<files.ListFolderError>) {
			subs.error(err);
		}
		function resHandler(res: files.ListFolderResult): any {
			res.entries.forEach(e => {
				subs.next(e);
			})
			if (res.has_more) {
				return client.filesListFolderContinue({
					cursor: res.cursor
				}).then(resHandler, errHandler);
			} else {
				subs.complete();
			}
		}
		client.filesListFolder(arg).then(resHandler, errHandler);
	})

}
export interface IOptions {

}
export interface IDropboxToken {
	access_token: string,
	account_id: string,
	token_type: "bearer",
	uid: string
}
export interface IUserInfo {
	profile_photo_url: string;
	name: string;
	orgInfo: string;
}
export interface IFolderEntry {
	text: string;
	link: string;
	path: string;
	type: "folder" | "htmlfile" | "datafolder"
}
export interface IWikiHandlerConstructor {
	new(): IWikiHandler;
}
export interface IWikiHandler {
	readUserInfo(): Promise<IUserInfo>;
	readFolder(path: string): Promise<IFolderEntry[]>;
	readFile(path: string): void;
	constructor(token: IDropboxToken, mode: string): void;
}

export interface TiddlyWikiInfo {
	plugins: string[];
	themes: string[];
	languages: string[];
	includeWiki: string[];
	build: any[];
}
export type MetadataEntry = (files.FileMetadataReference | files.FolderMetadataReference | files.DeletedMetadataReference);
export interface DataFolderState {
	folderPath: string;
	folderEntries: MetadataEntry[];
	has: { [K in "tiddlers" | "plugins" | "themes" | "languages" | "info"]: boolean };
	info: {
		stat: files.FileMetadata & { fileBlob: Blob; };
		json: TiddlyWikiInfo;
	};
	tiddlersEntries: MetadataEntry[];
	preload: files.FileMetadata[];
}

export class StatusHandler {

	constructor(private profilepic: string) {
		//initialize the status panel
		this.clearStatusMessage();
	}
	// private statusPanelCache: any;
	private getStatusPanel() {
		// if(this.statusPanelCache) return this.statusPanelCache;
		// debugger;
		var getElement = function (id: string, parentNode: Node) {
			parentNode = parentNode || document;
			var el = document.getElementById(id);

			if (!el) {
				el = document.createElement("div");
				el.setAttribute("id", id);
				parentNode.appendChild(el);
			}
			return el;
		},
			status = getElement("twits-status", document.body),
			message = getElement("twits-message", status),
			progress = getElement("twits-progress", status);
		status.style.display = "block";
		if (this.profilepic && status.getElementsByClassName('profile-pic').length === 0) {
			const profile = document.createElement('img');
			profile.src = this.profilepic;
			profile.classList.add("profile-pic");
			status.insertBefore(profile, message);
		}
		return { status: status, message: message, progress: progress };
		// return this.statusPanelCache;
	}

	clearStatusMessage() {
		var status = this.getStatusPanel();
		status.status.style.display = "none";
	}

	setStatusMessage(text: string) {
		var status = this.getStatusPanel();
		while (status.message.hasChildNodes()) {
			status.message.removeChild(status.message.firstChild as Node);
		}
		status.message.appendChild(document.createTextNode(text));
	}

}
export function contains<T>(item: any, array: { [K: string]: T }): item is T;
export function contains<T>(item: any, array: T[]): item is T;
export function contains<T>(item: any, array: any): item is T {
	return Array.isArray(array) ? (array.indexOf(item) !== -1) : Object.keys(array).findIndex(k => array[k] === item) !== -1;
}