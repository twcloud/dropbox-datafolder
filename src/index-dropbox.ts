import { files, Dropbox, Error as DbxError, users } from 'dropbox';
import { Observable, of, from, empty, merge, zip, concat, throwError, OperatorFunction, Subject } from 'rxjs';
import { map, reduce, catchError, tap, mergeMap, concatMap } from 'rxjs/operators';
import * as path from 'path';
import { Buffer } from "buffer";
import { contains, dbx_filesListFolder, StatusHandler } from './common';
import {
	Stats as IStats,
	FileFuncs as ff,
	obs_exists_result,
	obs_readdir_result,
	obs_readFile_result_inner,
	obs_stat_result,
	FileFuncs,
	IFolderEntry
} from './async-types';
import { Chooser } from './chooser';
import { override } from './async';

declare var window: Window & { $tw: any }

export function dumpToArray<T>(): OperatorFunction<T, T[]> {
	return (source: Observable<T>) => source.pipe(
		reduce<T, T[]>((n, e) => { n.push(e); return n; }, [] as T[])
	);
}
export type GetMetadataResult = (files.FileMetadataReference | files.FolderMetadataReference | files.DeletedMetadataReference);


export function getAppKey(type: string) {
	return (type === "full" ? "gy3j4gsa191p31x"
		: (type === "apps" ? "tu8jc7jsdeg55ta"
			: ""));
}
export class Stats implements IStats {
	constructor(private meta: files.MetadataReference) { }
	isFile() { return Stats.isFileMetadata(this.meta); };
	isDirectory() { return Stats.isFolderMetadata(this.meta) };
	isBlockDevice() { return false; }
	isCharacterDevice() { return false; }
	isSymbolicLink() { return false; }
	isFIFO() { return false; }
	isSocket() { return false; }
	get dev() { throw "not implemented" };
	get ino() { throw "not implemented" };
	get mode() { throw "not implemented" };
	get nlink() { throw "not implemented" };
	get uid() { throw "not implemented" };
	get gid() { throw "not implemented" };
	get rdev() { throw "not implemented" };
	get size() { return Stats.isFileMetadata(this.meta) ? this.meta.size : 0 };
	get blksize() { throw "not implemented" };
	get blocks() { throw "not implemented" };
	get atime() { return Stats.isFileMetadata(this.meta) ? new Date(this.meta.server_modified) : new Date(0) }
	get mtime() { return Stats.isFileMetadata(this.meta) ? new Date(this.meta.server_modified) : new Date(0) }
	get ctime() { return Stats.isFileMetadata(this.meta) ? new Date(this.meta.server_modified) : new Date(0) }
	get birthtime() { return Stats.isFileMetadata(this.meta) ? new Date(this.meta.server_modified) : new Date(0) }
	static isFileMetadata(a: files.MetadataReference): a is files.FileMetadataReference {
		return a[".tag"] === "file";
	}
	static isFolderMetadata(a: files.MetadataReference): a is files.FolderMetadataReference {
		return a[".tag"] === "folder";
	}
	static map(a: files.MetadataReference): Stats {
		return new Stats(a);
	}
	static getItemType(a: files.MetadataReference) {
		if (Stats.isFolderMetadata(a)) return "folder";
		else if (contains(path.extname(a.path_lower as string), ["htm", "html"])) return "htmlfile";
		else if (a.name === "tiddlywiki.info") return "datafolder";
		else return "other";
	}
}

function DropboxError<T>(err: DbxError<T>) {
	let error = new Error(err.error_summary);
	return error;
}

export const obs_stat: ff["obs_stat"] = (cont: Container, skipCache?: boolean) =>
	<T = undefined>(tag: T = undefined as any) =>
		(filepath: string) =>
			from(cont.cloud.filesGetMetadata({ path: filepath }, skipCache || false)).pipe(
				map(Stats.map),
				map((stat) => [undefined, stat, tag, filepath] as [undefined, Stats, T, string]),
				catchError((err, obs) => of(
					[err, undefined, tag, filepath] as [Error, undefined, T, string]
				))
			);

export const obs_exists: ff["obs_exists"] = (cont: Container, skipCache?: boolean) =>
	<T = undefined>(tag: T = undefined as any) =>
		(filepath: string) => obs_stat(cont, skipCache)(tag)(filepath)
			.pipe(map((ret) => [!ret[0] && !!ret[1], ret[2], ret[3]] as obs_exists_result<T>));

export const obs_readdir: ff["obs_readdir"] = (cont: Container) =>
	<T>(tag: T = undefined as any) => (filepath: string) =>
		from(cont.cloud.filesListFolder({ path: filepath }).then((files) => [
			undefined, files.map((e): IFolderEntry => {
				return {
					fullpath: e.path_lower as string || '',
					basename: path.basename(e.path_lower as string || ''),
					name: e.name,
					type: Stats.getItemType(e)
				}
			}), tag, filepath
		] as [undefined, IFolderEntry[], T, string], (err: DbxError<files.ListFolderError>) => [
			DropboxError(err), [], tag, filepath
		] as [Error, IFolderEntry[], T, string]))

export const obs_readFile: ff["obs_readFile"] = (cont: Container) => <T>(tag: T = undefined as any) => {
	function obs_readFile_inner(filepath: string): Observable<obs_readFile_result_inner<T, Buffer>>;
	function obs_readFile_inner(filepath: string, encoding: string): Observable<obs_readFile_result_inner<T, string>>;
	function obs_readFile_inner(filepath: string, encoding?: string) {
		return new Observable<obs_readFile_result_inner<T, any>>(subs => {
			const cb = (err: DbxError<files.DownloadError> | undefined, data?: Buffer | string) => {
				subs.next([err && DropboxError(err), data, tag, filepath]);
				subs.complete();
			};
			type R = files.FileMetadata & { fileBlob: Blob };
			cont.cloud.filesDownload({ path: filepath }).then(res => {
				var newbuff = Buffer.from(res.fileBuffer);
				cb(undefined, encoding ? newbuff.toString(encoding) : newbuff);
			}).catch(err => {
				console.error('readFile error %s', filepath, err);
				cb(err)
			})
		})
	}
	return obs_readFile_inner;
};



export class CloudObject {
	startup: boolean = true;
	get photoUrl() { return this.user }
	user: users.FullAccount = {} as any;
	constructor(public client: Dropbox) {

	}
	requestStartCount: number = 0;
	requestFinishCount: number = 0;
	resetCount() {
		this.requestStartCount = 0;
		this.requestFinishCount = 0;
	}
	cache: { [K: string]: files.MetadataReference } = {
		"/": { path_lower: "/", name: "" } as any
	};
	listedFolders: { [K: string]: files.MetadataReference[] } = {};
	filesGetMetadata(arg: files.GetMetadataArg, skipCache: boolean) {
		if (typeof arg.path !== "string") throw new Error("empty path");
		if (this.cache[arg.path]) return Promise.resolve(this.cache[arg.path]);
		let dirname = path.dirname(arg.path);
		let dircache = this.cache[dirname];
		let dirlist = dircache && this.listedFolders[dircache.path_lower as string];
		if (dircache && dirlist) {
			let item = dirlist.find(e => !!e.path_lower
				&& contains(path.basename(arg.path),
					[path.basename(e.path_lower as string), e.name]));
			if (item) return Promise.resolve(item);
			else return Promise.reject("path_not_found");
		}
		this.requestStartCount++;

		//if neither then we retrieve the file
		return this.client.filesGetMetadata(arg).then(res => {
			this.cache[arg.path] = res;
			this.cache[res.path_lower as string] = res;
			this.requestFinishCount++;
			return res;
		}, (err) => {
			this.requestFinishCount++;
			throw err;
		});
	}
	filesListFolder(arg: files.ListFolderArg) {
		if (typeof arg.path !== "string") throw new Error("empty path");
		this.requestStartCount++;
		//cache uses arg.path since it is assumed that a cased path using getMetadata will also do a readdir
		//we can't meta the root folder so we need some token gymnastics to skip the cache
		return new Promise<files.MetadataReference[]>((resolve, reject) => {
			Promise.resolve<files.MetadataReference | false>(
				arg.path ? this.cache[arg.path] || this.client.filesGetMetadata({ path: arg.path }) : false
			).then(meta => {
				if (meta) {
					this.cache[arg.path] = meta;
					this.cache[meta.path_lower as string] = meta;
				}
				let cached = this.listedFolders[meta ? meta.path_lower as string : ""];
				if (this.startup && cached) {
					this.requestStartCount--;
					return resolve(cached);
				} else {
					dbx_filesListFolder(this.client, arg).pipe(dumpToArray()).forEach(files => {
						this.requestFinishCount++;
						this.listedFolders[meta ? meta.path_lower as string : ""] = files;
						resolve(files);
					}).catch((err) => {
						this.requestFinishCount++;
						reject(err);
					})
				}
			})
		})
	}


	filesDownload(arg: files.DownloadArg) {
		if (typeof arg.path !== "string") throw new Error("empty path");
		this.requestStartCount++;
		if (this.startup && this.cache[arg.path] && (this.cache[arg.path] as any).fileBuffer) {
			this.requestStartCount--;
			return Promise.resolve(this.cache[arg.path] as any as files.FileMetadata & { fileBlob: Blob; fileBuffer: Buffer; });
		}
		return this.client.filesDownload(arg).then((res: any /* files.FileMetadata */) => {
			return fetch(URL.createObjectURL(res.fileBlob))
				.then((response) => response.arrayBuffer())
				.then((buff) => {
					this.requestFinishCount++;
					res.fileBuffer = Buffer.from(buff);
					if (this.startup) {
						this.cache[arg.path] = res;
						this.cache[res.path_lower] = res;
					}
					return res as files.FileMetadata & { fileBlob: Blob; fileBuffer: Buffer; }
				});
		}, (err) => {
			this.requestFinishCount++;
			throw err;
		})
	}
	filesCreateFolder(arg: files.CreateFolderArg) {
		throw "Method not implemented";
		if (typeof arg.path !== "string") throw new Error("empty path");
		return this.client.filesCreateFolder(arg).then((meta) => {
			(meta as any)[".tag"] = "folder";
			return meta as files.FolderMetadataReference
		}).then((meta) => {
			this.cache[meta.path_lower as string] = meta;
			this.cache[arg.path] = meta;
		})
	}

	static readonly tiddlyWebPlugin = {
		"title": "$:/plugins/tiddlywiki/tiddlyweb",
		"description": "TiddlyWeb and TiddlySpace components",
		"author": "JeremyRuston",
		"core-version": ">=5.0.0",
		"list": "readme",
		"version": "5.1.18-prerelease",
		"plugin-type": "plugin",
		"dependents": "",
		"type": "application/json",
		"text": '{ "tiddlers": {} }'
	};
}
export class Container {
	// cloud: CloudObject
	// wikidud: T = undefined as any;
	constructor(public cloud: CloudObject) {
		// this.cloud = new CloudObject(client);
		this.requests.asObservable().pipe(concatMap(([name, type, resolve]) => new Observable(subs => {
			fetch("twits-5-1-17/" + type + "s/" + name + "/plugin.txt").then((res) => {
				if (res.status < 400) return res.text().then(data => {
					const split = data.indexOf('\n');
					const meta = JSON.parse(data.slice(0, split)),
						text = data.slice(split + 2);
					meta.text = text;
					resolve(res);
					subs.complete();
				});
				else {
					resolve(false);
					subs.complete();
				}
			})
		}))).subscribe();
	}
	private requests = new Subject();
	getNamedPlugin(name: string, type: string): Promise<{} | false> {
		//if the tiddlyweb adapter is specified, return our own version of it
		if (type === "plugin" && name === "tiddlywiki/tiddlyweb")
			return Promise.resolve(CloudObject.tiddlyWebPlugin);
		//otherwise fetch it from where it is stored
		else return new Promise(resolve => this.requests.next([name, type, resolve]));
	}
}

export const ENV: { [K: string]: string } = (window as any).env || {};

const ff: FileFuncs = {
	obs_exists, obs_readdir, obs_readFile, obs_stat, ENV
};

(window as any).$tw = {
	boot: { suppressBoot: true, files: {} },
	preloadTiddlers: [
		{ title: "$:/core/modules/savers/put.js", text: "" }
	]
};


// Handle the search params and dropbox auth token

const url = new URL(location.href);
let options: any = {
	type: decodeURIComponent(url.searchParams.get('type') || ''),
	path: decodeURIComponent(url.searchParams.get('path') || ''),
	user: decodeURIComponent(url.searchParams.get('user') || '')
}
const OPTIONS_CACHE_KEY = "twits-options"
if (url.searchParams.get('source') === "oauth2") {
	//parse the oauth token
	options.token = {};
	let hashtoken = location.hash;
	if (hashtoken.startsWith("#")) hashtoken = hashtoken.slice(1);
	hashtoken.split('&').map((item: any) => {
		let part = item.split('=');
		options.token[part[0]] = decodeURIComponent(part[1]);
	});
	//parse the state, store everything, and redirect back to ?type=%type
	let { path, user, type, hash } = JSON.parse(decodeURIComponent(options.token.state) || '{}');
	if (type === options.type) {
		options.path = path;
		options.user = user;
	}
	if (!hash.startsWith("#")) hash = "#" + hash;
	sessionStorage.setItem(OPTIONS_CACHE_KEY, JSON.stringify(options));
	location.href = location.origin + location.pathname + "?type=" + options.type + hash;
} else {
	let store = sessionStorage.getItem(OPTIONS_CACHE_KEY);
	sessionStorage.setItem(OPTIONS_CACHE_KEY, "");
	//if we have stored options, ignore anything else
	if (store) options = JSON.parse(store);
	options.hash = location.hash;

	if (options.type && !(options.token && options.token.access_token)) {
		if (options.type !== "full" && options.type !== "apps") throw "Invalid option type";
		var token = localStorage.getItem('twits-devtoken') || '';
		if (token) options.token = { access_token: token };
		else location.href = new Dropbox({ clientId: getAppKey(options.type) }).getAuthenticationUrl(
			encodeURIComponent(location.origin + location.pathname + "?source=oauth2&type=" + options.type),
			encodeURIComponent(JSON.stringify({
				type: options.type,
				path: options.path,
				user: options.user,
				hash: options.hash
			}))
		)
	}
}
//  = Promise.resolve([]);
if(options.type){
	var cloud = new CloudObject(new Dropbox({ clientId: getAppKey(options.type) }));
	cloud.client.setAccessToken(options.token.access_token);
	var preload = cloud.filesListFolder({ path: "" });	
}

window.addEventListener('load', () => {

	if (!options.type) {
		var container = document.createElement('div');
		container.id = "twits-greeting";
		container.appendChild(Chooser.getHeaderElement());
		{
			var selector = document.createElement('div');
			selector.id = "twits-selector";
			selector.innerHTML = `
	<a class="access-full button" href="?type=full">Full Dropbox Access</a>
	<a class="access-apps button" href="?type=apps">Apps Folder Access</a>`
			container.appendChild(selector);
		}
		container.appendChild(Chooser.getFooterElement());
		document.body.appendChild(container);
	} else {
		var container = document.createElement('div');
		container.id = 'twits-chooser';
		document.body.appendChild(container);

		var cont = new Container(cloud);
		var chooser = new Chooser(container, cont, ff, options);

		Promise.all([
			preload,
			cloud.client.usersGetCurrentAccount(undefined)
		]).then(([files, _user]) => {
			cloud.user = _user;
			//update the chooser with the user info
			chooser.status = new StatusHandler(cloud.user.profile_photo_url || "");
			chooser.userInfo = {
				accountID: _user.account_id,
				profile_photo_url: _user.profile_photo_url as string || '',
				name: _user.name.display_name,
				orgInfo: _user.team && _user.team.name || ''
			}
			//check the url is for the current user
			if (options.user && cloud.user.account_id !== options.user) {
				alert('You are logged into a different dropbox account than the one specified in this link');
				delete options.user;
				delete options.path;
				delete options.type;
			}
			//check for a preload or load the chooser
			if (options.path) return Promise.resolve(options.path as string);
			else return new Promise<IFolderEntry | string>(resolve => chooser.loadChooser(resolve))
		}).then((stat) => {
			container.style.display = "none";
			chooser.status.setStatusMessage("Loading...");
			cloud.filesDownload({ path: typeof stat === "string" ? stat : stat.fullpath })
				.then(stat => handleDatafolder(cloud, stat));
		})
	}
});
function handleDatafolder(cloud: CloudObject, stat: files.FileMetadata) {
	// let cloud = chooser.cloud;
	const status = new StatusHandler("");
	override((window as any).$tw, new Container(cloud), ff);
	let clear = setInterval(() => {
		status.setStatusMessage(cloud.requestFinishCount + "/" + cloud.requestStartCount)
	}, 100);
	var folderPath = path.dirname(stat.path_lower as string);
	console.time('handleDatafolder')
	return cloud.filesListFolder({ path: folderPath }).then(files => {
		// for now let's not make any changes until I've tested everything
		// let index = files.findIndex(e => Stats.isFolderMetadata(e) && e.name === "tiddlers");
		// if (index === -1)
		// 	return chooser.cloud.filesCreateFolder({ path: path.join(folderPath, "tiddlers") }).catch(() => true)
		// else
		return Promise.resolve(true);
	}).then(() => {
		return new Promise(resolve => {
			console.timeEnd('handleDatafolder');
			console.time('tiddlywikiboot');
			window.$tw.boot.wikiPath = folderPath;
			window.$tw.boot.boot(resolve);
		});
	}).then(() => {
		console.timeEnd('tiddlywikiboot');
		clearInterval(clear);
		status.clearStatusMessage();
	})
}