import { files, Dropbox, Error } from 'dropbox';
import { Observable, of, asyncScheduler, from, empty, merge, zip, concat, throwError, OperatorFunction } from 'rxjs';
import { dbx_filesListFolder, GetMetadataResult, dumpToArray, TiddlyWikiInfo } from '../src/common';
import { map, mergeMap, reduce, ignoreElements, concatMap, catchError, zipAll, tap, count, mapTo } from '../node_modules/rxjs/operators';
import * as path from 'path';
import { Buffer } from "buffer";

declare var window: Window & { $tw: $TW, env: any };

class Stats {
	constructor(private meta: GetMetadataResult) {

	}
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
	static isFileMetadata(a: GetMetadataResult): a is files.FileMetadataReference {
		return a[".tag"] === "file";
	}
	static isFolderMetadata(a: GetMetadataResult): a is files.FolderMetadataReference {
		return a[".tag"] === "folder";
	}
	static map(a: GetMetadataResult): Stats {
		return new Stats(a);
	}
}


export type obs_stat_result<T> = [Error<files.GetMetadataError>, undefined, T, string] | [undefined, Stats, T, string]
export const obs_stat = (cloud: CloudObject, skipCache?: boolean) =>
	<T = undefined>(tag: T = undefined as any) =>
		(filepath: string) =>
			from(cloud.filesGetMetadata({ path: filepath }, skipCache || false))
				.pipe(map(Stats.map))
				.pipe(
					map((stat) => [undefined, stat, tag, filepath] as obs_stat_result<T>),
					catchError((err, obs) => {
						// console.error('stat error %s', filepath, err);
						return of([err, undefined, tag, filepath] as obs_stat_result<T>);
					})
				);

export type obs_exists_result<T> = [boolean, T, string]
export const obs_exists = (cloud: CloudObject, skipCache?: boolean) =>
	<T = undefined>(tag: T = undefined as any) =>
		(filepath: string) =>
			obs_stat(cloud, skipCache)(tag)(filepath).pipe(map((ret) =>
				[!ret[0] && !!ret[1], ret[2], ret[3]] as obs_exists_result<T>
			));

export type obs_readdir_result<T> = [Error<files.ListFolderError> | undefined, Array<string>, T, string];
export const obs_readdir = (cloud: CloudObject) =>
	<T>(tag: T = undefined as any) =>
		(filepath: string) =>
			cloud.filesListFolder({ path: filepath })
				.pipe(
					map(files => [
						undefined,
						files.map(e => path.basename(e.path_lower as string)),
						tag, filepath
					] as obs_readdir_result<T>),
					catchError((err: Error<files.ListFolderError>, obs) => {
						// console.error('readdir error %s', filepath, err);
						return of([err, undefined, tag, filepath] as never);
					})
				);


export type obs_readFile_result_inner<T, U> = [Error<files.DownloadError>, undefined, T, string] | [undefined, U, T, string];

declare function obs_readFile_inner<T>(filepath: string): Observable<obs_readFile_result_inner<T, Buffer>>;
declare function obs_readFile_inner<T>(filepath: string, encoding: string): Observable<obs_readFile_result_inner<T, string>>;

export const obs_readFile = (cloud: CloudObject) =>
	<T>(tag: T = undefined as any) =>
		((filepath: string, encoding?: string) =>
			new Observable(subs => {
				const cb = (err: Error<files.DownloadError> | undefined, data?: Buffer | string) => {
					subs.next([err, data, tag, filepath]);
					subs.complete();
				};
				// if (encoding) throw "encoding not supported";
				type R = files.FileMetadata & { fileBlob: Blob };
				cloud.filesDownload({ path: filepath }).then((data) => {
					return fetch(URL.createObjectURL((data as R).fileBlob))
				}).then(res =>
					res.arrayBuffer()
				).then(buff => {
					var newbuff = Buffer.from(buff);
					cb(undefined, encoding ? newbuff.toString(encoding) : newbuff);
				}).catch(err => {
					console.error('readFile error %s', filepath, err);
					cb(err)
				})
			})
		) as typeof obs_readFile_inner;


// export const obs_readFile =

export interface $TW {
	loadMetadataForFile: typeof loadMetadataForFile;
	loadTiddlersFromFile: typeof loadTiddlersFromFile;
	loadTiddlersFromPath: typeof loadTiddlersFromPath;
	loadTiddlersFromSpecification: typeof loadTiddlersFromSpecification;
	loadPluginFolder: typeof loadPluginFolder;
	findLibraryItem: typeof findLibraryItem;
	loadPlugin: typeof loadPlugin;
	getLibraryItemSearchPaths: typeof getLibraryItemSearchPaths;
	loadPlugins: typeof loadPlugins;
	loadWikiTiddlers: typeof loadWikiTiddlers;
	loadTiddlersNode: typeof loadTiddlersNode;
	//we pretend for the type checker that $TW has a cloud object, but it actually doesn't
	//this prevents error TS2684 in the type checker
	cloud: CloudObject;
	[K: string]: any;
}

declare const $tw: $TW;
function obs_tw_each<T>(obj: { [K: string]: T }): Observable<[T, string]>;
function obs_tw_each<T>(obj: T[]): Observable<[T, number]>;
function obs_tw_each(obj: any) {
	return new Observable(subs => {
		$tw.utils.each(obj, (item: any, index: any) => { subs.next([item, index]); });
		subs.complete();
	})
}

const isArray = Array.isArray;
// =======================================================

interface TiddlerFileInfo {
	tiddlers: any[],
	filepath?: string,
	type?: string,
	hasMetaFile?: boolean
}

function loadTiddlersFromFile(this: $TW, filepath: string, fields: any) {
	//get the type info for this extension
	var ext = path.extname(filepath),
		extensionInfo = $tw.utils.getFileExtensionInfo(ext),
		type = extensionInfo ? extensionInfo.type : null,
		typeInfo = type ? $tw.config.contentTypeInfo[type] : null;
	//read the file without checking if it exists
	return obs_readFile(this.cloud)()(filepath, typeInfo ? typeInfo.encoding : "utf8").pipe(
		//parse the tiddlers in the file
		map(data => $tw.wiki.deserializeTiddlers(ext, data, fields)), mergeMap(tiddlers =>
			//if there is exactly one tiddler and it isn't a json file, load the metadata
			((ext !== ".json" && tiddlers.length === 1) ? $tw.loadMetadataForFile(filepath) : of(false)).pipe(map(metadata => {
				//if there is metadata, add it to the tiddlers array
				if (metadata) tiddlers = [$tw.utils.extend({}, tiddlers[0], metadata)];
				//return the TiddlerFileInfo
				return { filepath, type, tiddlers, hasMetaFile: !!metadata } as TiddlerFileInfo
			}))
		)
	);
}

/**
 * Load the metadata fields in the .meta file corresponding to a particular file. 
 * Emits the parsed meta fields or emits false if the meta file does not exist.
 * Uses obs_exists to check if the file exists before reading it.
 * @param this 
 * @param filepath Path to check for a .meta file for. 
 */
function loadMetadataForFile(this: $TW, filepath: string) {
	//check if there is actually a meta file for this filepath
	return obs_exists(this.cloud)()(filepath + ".meta").pipe(
		// read the file if it exists
		mergeMap(([exists, tag, metafilename]) =>
			exists ? obs_readFile(this.cloud)()(metafilename, "utf8") : of(false)),
		//parse the file if there is anything to parse
		map(data => data && $tw.utils.parseFields(data))
	)
}


function loadTiddlersFromPath(this: $TW, filepath: string, excludeRegExp: RegExp = $tw.boot.excludeRegExp): Observable<TiddlerFileInfo> {
	//stat the filepath
	return obs_stat(this.cloud)()(filepath).pipe(mergeMap(([err, stat, tag]) => stat.isDirectory()
		//if we have a directory, read the files
		? obs_readdir(this.cloud)()(filepath).pipe(
			//check for a tiddlywiki.files file in the folder
			mergeMap(([err, files]) => (files.indexOf("tiddlywiki.files") !== -1)
				//if there is one, loadTiddlersFromSpecification
				? $tw.loadTiddlersFromSpecification(filepath, excludeRegExp)
				//otherwise, load all the files that don't match excludeRegExp (except plugin.info)
				: from(files.filter(file => !excludeRegExp.test(file) && file !== "plugin.info"))
					.pipe(mergeMap(file => $tw.loadTiddlersFromPath(filepath + path.sep + file, excludeRegExp)))
			))
		//if we have a file, load it
		: ((stat.isFile()) ? $tw.loadTiddlersFromFile(filepath, { title: filepath }) : empty())
	))
}
type ProcessMatrix = [any[], { [K: string]: { source: string, prefix: string, suffix: string } }];
type ProcessFileInput = { filename: string, isTiddlerFile: boolean, fields: any };
/**
 * This very crazy function should actually be the correct translation of processfile
 */
function loadTiddlersFromSpecificationProcessFile(self: $TW, filepath: string) {
	function getFieldValue(tiddler: {}, name: string, fieldInfo: { source: string }, filename: string, pathname: string) {
		var value = tiddler[name];
		switch (fieldInfo.source) {
			case "filename":
				return of(path.basename(filename));
			case "filename-uri-decoded":
				return of(decodeURIComponent(path.basename(filename)));
			case "basename":
				return of(path.basename(filename, path.extname(filename)));
			case "basename-uri-decoded":
				return of(decodeURIComponent(path.basename(filename, path.extname(filename))));
			case "extname":
				return of(path.extname(filename));
			case "created":
				return obs_stat(self.cloud)()(pathname).pipe(map(([err, stat]) => new Date(stat.birthtime)));
			case "modified":
				return obs_stat(self.cloud)()(pathname).pipe(map(([err, stat]) => new Date(stat.mtime)));
			default:
				return of(value);
		}
	}

	return (source: Observable<ProcessFileInput>) => source.pipe(mergeMap(({ filename, isTiddlerFile, fields }) => {
		var extInfo = $tw.config.fileExtensionInfo[path.extname(filename)],
			type = (extInfo || {}).type || fields.type || "text/plain",
			typeInfo = $tw.config.contentTypeInfo[type] || {},
			pathname = path.resolve(filepath, filename);
		return zip(
			obs_readFile(self.cloud)()(pathname, typeInfo.encoding || "utf8"),
			$tw.loadMetadataForFile(pathname)
		).pipe(
			//if there is an error reading the file, then throw it
			tap(([[err]]) => { throw err }),
			//deserialize and combine the result
			map(([[err, text], metadata]) => [
				((isTiddlerFile)
					? $tw.wiki.deserializeTiddlers(path.extname(pathname), text, metadata)
					: [$tw.utils.extend({ text }, metadata || {})]),
				$tw.utils.extend({}, fields, metadata || {})
			] as ProcessMatrix),
			//process the product of the two variables
			mergeMap(([fileTiddlers, combinedFields]) => obs_tw_each(fileTiddlers).pipe(
				mergeMap(([tiddler]) => obs_tw_each(combinedFields).pipe(
					mergeMap(([fieldInfo, name]) =>
						(typeof fieldInfo === "string" || $tw.utils.isArray(fieldInfo))
							//if it is simple field info, forward it
							? of([fieldInfo as any, name])
							//otherwise expect a field definition object and process it
							: getFieldValue(tiddler, name, fieldInfo, filename, pathname)
								.pipe(map(value => [(fieldInfo.prefix || "") + value + (fieldInfo.suffix || ""), name]))),
					// assign the resulting value to the tiddler
					tap(([value, name]) => { tiddler[name] = value; })
				)),
				//count will only emit once the fileTiddlers have been processed
				count(),
				//once we're done, 
				mapTo({ tiddlers: fileTiddlers })
			))
		)
	}))
}

function loadTiddlersFromSpecification(this: $TW, filepath: string, excludeRegExp: RegExp): Observable<TiddlerFileInfo> {
	// const processFile = ;
	type DirSpec = (string | { path: string, filesRegExp?: string, isTiddlerFile: boolean, fields: any });

	return obs_readFile(this.cloud)()(filepath + path.sep + "tiddlywiki.files", "utf8").pipe(map(([err, data]): any => {
		if (err) throw "Error reading tiddlywiki.files";
		return JSON.parse(data);
	}), mergeMap((filesInfo) => concat(
		//first load the specified tiddlers
		obs_tw_each(filesInfo.tiddlers as any[]).pipe(tap(([tidInfo]) => {
			if (tidInfo.prefix && tidInfo.suffix) {
				tidInfo.fields.text = { prefix: tidInfo.prefix, suffix: tidInfo.suffix };
			} else if (tidInfo.prefix) {
				tidInfo.fields.text = { prefix: tidInfo.prefix };
			} else if (tidInfo.suffix) {
				tidInfo.fields.text = { suffix: tidInfo.suffix };
			}
		}), loadTiddlersFromSpecificationProcessFile(this, filepath)),
		//then load the specified directories
		obs_tw_each(filesInfo.directories as DirSpec[]).pipe(mergeMap(([dirSpec]) => {
			if (typeof dirSpec === "string") {
				//if the dirSpec is a string, we load the path
				return obs_stat(this.cloud)(dirSpec)(path.resolve(filepath, dirSpec))
					.pipe(mergeMap(([err, stat, dirSpec, pathname]) =>
						(!err && stat.isDirectory()) ? $tw.loadTiddlersFromPath(pathname, excludeRegExp) : empty()
					))
			} else {
				//if it is an object there is more to the story
				const fileRegExp = new RegExp(dirSpec.filesRegExp || "^.*$"), metaRegExp = /^.*\.meta$/;
				const dirPath = path.resolve(filepath, dirSpec.path);
				const { isTiddlerFile, fields } = dirSpec;
				return obs_readdir(this.cloud)()(dirPath).pipe(
					//filter the list of files to only load the valid ones
					mergeMap(([err, files, tag, dirPath]) => from(files.filter(filename =>
						filename !== "tiddlywiki.files" && !metaRegExp.test(filename) && fileRegExp.test(filename)
					))),
					//map each file to the processFile input arguments
					map(filename => { return { filename: dirPath + path.sep + filename, isTiddlerFile, fields } }),
					//process the file to get the tiddlers from it
					loadTiddlersFromSpecificationProcessFile(this, filepath)
				)
			}
		}))
	)))
}
// =======================================================

export class CloudObject {
	constructor(public client: Dropbox) {

	}
	requestStartCount: number = 0;
	requestFinishCount: number = 0;
	resetCount() {
		this.requestStartCount = 0;
		this.requestFinishCount = 0;
	}
	cache: { [K: string]: GetMetadataResult } = {};
	listedFolders: { [K: string]: GetMetadataResult[] } = {};
	filesGetMetadata(arg: files.GetMetadataArg, skipCache: boolean) {
		if (!arg.path) throw new Error("empty path");
		this.requestStartCount++;
		let folder = path.dirname(arg.path);
		if (skipCache || (!this.listedFolders[folder] && !this.cache[arg.path])) {
			return this.client.filesGetMetadata(arg).then(res => {
				this.cache[arg.path] = res;
				this.requestFinishCount++;
				return res;
			}, (err) => {
				this.requestFinishCount++;
				throw err;
			})
		} else {
			this.requestStartCount--;
			if (this.listedFolders[folder]) {
				let index = this.listedFolders[folder].findIndex((e) =>
					path.join(folder, path.basename(e.path_lower as string)) === arg.path
				);
				if (index === -1) return Promise.reject("path_not_found");
				else return Promise.resolve(this.listedFolders[folder][index]);
			} else if (this.cache[arg.path]) {
				return Promise.resolve(this.cache[arg.path]);
			} else {
				return Promise.reject("path_not_found");
			}
		}
	}
	filesListFolder(arg: files.ListFolderArg) {
		if (!arg.path) throw new Error("empty path");
		this.requestStartCount++;
		return dbx_filesListFolder(this.client, arg).pipe(forEach((item) => {
			this.cache[path.join(arg.path, path.basename(item.path_lower as string))] = item;
		}), dumpToArray(), forEach((res) => {
			this.listedFolders[arg.path] = res;
			this.requestFinishCount++;
		}), catchError((err, obs) => {
			this.requestFinishCount++;
			return throwError(err);
		}));
	}
	filesDownload(arg: files.DownloadArg) {
		if (!arg.path) throw new Error("empty path");
		this.requestStartCount++;
		return this.client.filesDownload(arg).then(res => {
			this.requestFinishCount++;
			this.cache[res.path_lower as string] = res as any;
			return res;
		}, (err) => {
			this.requestFinishCount++;
			throw err;
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
	getNamedPlugin(name: string, type: string): Promise<{} | false> {
		//if the tiddlyweb adapter is specified, return our own version of it
		if (type === "plugin" && name === "tiddlywiki/tiddlyweb")
			return Promise.resolve(CloudObject.tiddlyWebPlugin);
		//otherwise fetch it from where it is stored
		return fetch("twits-5-1-17/" + type + "/" + name + "/plugin.txt")
			.then(res => {
				if (res.status > 399) return false;
				else return res.text().then(data => {
					const split = data.indexOf('\n');
					const meta = JSON.parse(data.slice(0, split)),
						text = data.slice(split + 2);
					meta.text = text;
					return meta;
				})
			})
	}
}

export function override($tw: $TW, client: Dropbox) {
	const container = {
		cloud: new CloudObject(client)
	};
	$tw.findLibraryItem = findLibraryItem.bind(container);
	$tw.getLibraryItemSearchPaths = getLibraryItemSearchPaths.bind(container);
	$tw.loadMetadataForFile = loadMetadataForFile.bind(container);
	$tw.loadPlugin = loadPlugin.bind(container);
	$tw.loadPluginFolder = loadPluginFolder.bind(container);
	$tw.loadPlugins = loadPlugins.bind(container);
	$tw.loadTiddlersFromFile = loadTiddlersFromFile.bind(container);
	$tw.loadTiddlersFromPath = loadTiddlersFromPath.bind(container);
	$tw.loadTiddlersFromSpecification = loadTiddlersFromSpecification.bind(container);
	$tw.loadWikiTiddlers = loadWikiTiddlers.bind(container);
	$tw.loadTiddlersNode = loadTiddlersNode.bind(container);
	$tw.boot.excludeRegExp = $tw.boot.excludeRegExp || /^\.DS_Store$|^.*\.meta$|^\..*\.swp$|^\._.*$|^\.git$|^\.hg$|^\.lock-wscript$|^\.svn$|^\.wafpickle-.*$|^CVS$|^npm-debug\.log$/;
	return container.cloud;
}