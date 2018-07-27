import { files, Dropbox, Error } from 'dropbox';
import { Observable, of, asyncScheduler, from, empty, merge, zip, concat, throwError } from 'rxjs';
import { dbx_filesListFolder, GetMetadataResult, dumpToArray, TiddlyWikiInfo } from './common';
import { map, mergeMap, reduce, ignoreElements, concatMap, catchError, tap as forEach } from '../node_modules/rxjs/operators';
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
// new Observable<GetMetadataResult>(subs => {
// 	client.filesGetMetadata({ path: filepath }).then((data) => {
// 		subs.next([undefined, data, tag, filepath]);
// 		subs.complete();
// 	}, (err) => {
// 		subs.next([err, undefined, tag, filepath]);
// 		subs.complete();
// 	});
// }).pipe(map(Stats.map), map((stat) => ));

export type obs_exists_result<T> = [boolean, T, string]
export const obs_exists = (cloud: CloudObject, skipCache?: boolean) =>
	<T = undefined>(tag: T = undefined as any) =>
		(filepath: string) =>
			obs_stat(cloud, skipCache)(tag)(filepath).pipe(map((ret) =>
				[!ret[0] && !!ret[1], ret[2], ret[3]] as obs_exists_result<T>
			));
// new Observable<obs_exists_result<T>>(subs => {
// 	client.filesGetMetadata({ path: filepath }).then((data) => {
// 		subs.next([true, tag, filepath]);
// 		subs.complete();
// 	}, (err: Error<files.GetMetadataError>) => {
// 		subs.next([false, tag, filepath]);
// 		subs.complete();
// 	})
// })

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

// ({ path: filepath }).then((data) => {
// 	subs.next([undefined, data, tag, filepath]);
// 	subs.complete();
// }, (err: Error<files.ListFolderError>) => {
// 	subs.next([err, undefined, tag, filepath]);
// 	subs.complete();
// });
// return fs.readdir(filepath, (err, data) => {
// 	subs.next([err, data, tag, filepath]);
// 	subs.complete();
// })

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

function loadTiddlersFromFile(this: $TW, filepath: string, fields: any) {
	var ext = path.extname(filepath),
		extensionInfo = $tw.utils.getFileExtensionInfo(ext),
		type = extensionInfo ? extensionInfo.type : null,
		typeInfo = type ? $tw.config.contentTypeInfo[type] : null;

	return obs_readFile(this.cloud)()(filepath, typeInfo ? typeInfo.encoding : "utf8")
		.pipe(mergeMap(([err, data]) => {
			if (err || !data) {
				console.log('Error reading file %s', filepath, err);
				return empty();
			}
			var tiddlers = $tw.wiki.deserializeTiddlers(ext, data, fields);
			if (ext !== ".json" && tiddlers.length === 1) {
				return $tw.loadMetadataForFile(filepath).pipe(map(metadata => {
					tiddlers = [$tw.utils.extend({}, tiddlers[0], metadata)];
					return { filepath: filepath, type: type, tiddlers: tiddlers, hasMetaFile: true };
				}));
			} else {
				return of({ filepath: filepath, type: type, tiddlers: tiddlers, hasMetaFile: false })
			}
		}));
};

function loadMetadataForFile(this: $TW, filepath: string) {
	var metafilename = filepath + ".meta";
	return obs_exists(this.cloud)()(metafilename)
		.pipe(mergeMap(([exists]) => {
			if (exists) return obs_readFile(this.cloud)()(metafilename, "utf8");
			else return of<[true]>([true]);
		}))
		.pipe(map(([err, data]) => {
			if (err) return {};
			else return $tw.utils.parseFields(data) as {};
		}));
};


function loadTiddlersFromPath(this: $TW, filepath: string, excludeRegExp: RegExp = $tw.boot.excludeRegExp): Observable<{
	filepath: any;
	type: any;
	tiddlers: any[];
	hasMetaFile: boolean;
}> {
	// excludeRegExp = excludeRegExp || ;
	return obs_stat(this.cloud)()(filepath).pipe(mergeMap(([err, stat]) => {
		if (err || !stat) {
			return empty();
		} else if (!err && stat.isDirectory()) {
			return obs_readdir(this.cloud)()(filepath).pipe(mergeMap(([err, files]) => {
				if (err) return empty();
				if (files.indexOf("tiddlywiki.files") !== -1)
					return $tw.loadTiddlersFromSpecification(filepath, excludeRegExp) as any;
				else return from(files).pipe(mergeMap(file => {
					if (!excludeRegExp.test(file) && file !== "plugin.info") {
						return $tw.loadTiddlersFromPath(filepath + path.sep + file, excludeRegExp) as any;
					} else {
						return empty();
					}
				}));
			}))
		} else if (stat.isFile()) {
			return $tw.loadTiddlersFromFile(filepath, { title: filepath });
		} else {
			return empty();
		}
	}))
};

function loadTiddlersFromSpecification(this: $TW, filepath: string, excludeRegExp: RegExp) {
	var tiddlers = [];
	// Read the specification
	return obs_readFile(this.cloud)()(filepath + path.sep + "tiddlywiki.files", "utf8").pipe(map(([err, data]) => {
		if (err || !data) throw "error reading tiddlywiki.files in loadTiddlersFromSpecification";
		var filesInfo = JSON.parse(data);
		return merge(
			// Process the listed tiddlers
			obs_tw_each(filesInfo.tiddlers).pipe(mergeMap(([tidInfo]: [any]) => {
				if (tidInfo.prefix && tidInfo.suffix) {
					tidInfo.fields.text = { prefix: tidInfo.prefix, suffix: tidInfo.suffix };
				} else if (tidInfo.prefix) {
					tidInfo.fields.text = { prefix: tidInfo.prefix };
				} else if (tidInfo.suffix) {
					tidInfo.fields.text = { suffix: tidInfo.suffix };
				}
				return processFile(tidInfo.file, tidInfo.isTiddlerFile, tidInfo.fields);

			})),
			// Process any listed directories
			obs_tw_each(filesInfo.directories).pipe(mergeMap(([dirSpec]: [any]) => {
				// Read literal directories directly
				if (typeof dirSpec === "string") {
					var pathname = path.resolve(filepath, dirSpec);
					return obs_stat(this.cloud)()(pathname).pipe(mergeMap(([err, stat]) => {
						if (!err && stat && stat.isDirectory())
							return $tw.loadTiddlersFromPath(pathname, excludeRegExp)
						else
							return empty();
					}))
				} else {
					// Process directory specifier
					var dirPath = path.resolve(filepath, dirSpec.path);
					return obs_readdir(this.cloud)()(dirPath).pipe(map(([err, files]) => {
						var fileRegExp = new RegExp(dirSpec.filesRegExp || "^.*$"),
							metaRegExp = /^.*\.meta$/;
						return from(files).pipe(mergeMap(filename => {
							if (filename !== "tiddlywiki.files" && !metaRegExp.test(filename) && fileRegExp.test(filename)) {
								return processFile(dirPath + path.sep + filename, dirSpec.isTiddlerFile, dirSpec.fields);
							} else {
								return empty();
							}
						}))
					}))
				}
			})
			))
	}))
	// Helper to process a file
	const processFile = (filename: string, isTiddlerFile: boolean, fields: any): Observable<{ tiddlers: any[] }> => {
		var extInfo = $tw.config.fileExtensionInfo[path.extname(filename)],
			type = (extInfo || {}).type || fields.type || "text/plain",
			typeInfo = $tw.config.contentTypeInfo[type] || {},
			pathname = path.resolve(filepath, filename);
		return zip(
			obs_readFile(this.cloud)()(pathname, typeInfo.encoding || "utf8"),
			$tw.loadMetadataForFile(pathname)
		).pipe(mergeMap(([text, metadata]) => {
			var fileTiddlers;
			if (isTiddlerFile) {
				fileTiddlers = $tw.wiki.deserializeTiddlers(path.extname(pathname), text, metadata) || [];
			} else {
				fileTiddlers = [$tw.utils.extend({ text: text }, metadata)];
			}
			var combinedFields = $tw.utils.extend({}, fields, metadata);
			return obs_tw_each(fileTiddlers).pipe(mergeMap((tiddler: any) => {
				return obs_tw_each(combinedFields).pipe(mergeMap(([fieldInfo, name]: any) => {
					if (typeof fieldInfo === "string" || $tw.utils.isArray(fieldInfo)) {
						tiddler[name] = fieldInfo;
						//this will signal immediate completion
						return empty();
					} else {
						var value = tiddler[name];
						//holds an arraylike or observable with exactly one item
						var newValue: any = (() => {
							switch (fieldInfo.source) {
								case "filename":
									return [path.basename(filename)];
								case "filename-uri-decoded":
									return [decodeURIComponent(path.basename(filename))];
								case "basename":
									return [path.basename(filename, path.extname(filename))];
								case "basename-uri-decoded":
									return [decodeURIComponent(path.basename(filename, path.extname(filename)))];
								case "extname":
									return [path.extname(filename)];
								case "created":
									return obs_stat(this.cloud)()(pathname).pipe(map(([err, stat]) => stat && new Date(stat.birthtime)));
								case "modified":
									return obs_stat(this.cloud)()(pathname).pipe(map(([err, stat]) => stat && new Date(stat.mtime)));
							}
						})();
						//here we ignore elements to capture observable completion
						return from(newValue).pipe(map(value => {
							if (fieldInfo.prefix) {
								value = fieldInfo.prefix + value;
							}
							if (fieldInfo.suffix) {
								value = value + fieldInfo.suffix;
							}
							tiddler[name] = value;
						})).pipe(ignoreElements());
					}

				})).pipe(reduce((n) => n, tiddler)); //we reduce this so the tiddler is eventually returned
			})).pipe(reduce<any, { tiddlers: any[] }>((n, e) => {
				n.tiddlers.push(e);
				return n;
			}, { tiddlers: [] }));
		}))
	};


}

function loadPluginFolder(this: $TW, filepath: string, excludeRegExp?: RegExp) {
	excludeRegExp = excludeRegExp || $tw.boot.excludeRegExp;
	var infoPath = filepath + path.sep + "plugin.info";
	return obs_stat(this.cloud)()(filepath).pipe(mergeMap(([err, stat]) => {
		if ((err) || (stat && !stat.isDirectory())) return empty();

		return obs_readFile(this.cloud)()(infoPath, "utf8").pipe(mergeMap(([err, data]) => {
			if (err || !data) {
				console.log("Warning: missing plugin.info file in " + filepath);
				return empty();
			}
			var pluginInfo = JSON.parse(data);
			pluginInfo.tiddlers = pluginInfo.tiddlers || Object.create(null);
			return $tw.loadTiddlersFromPath(filepath, excludeRegExp).pipe(dumpToArray(), map(pluginFiles => {
				// Save the plugin tiddlers into the plugin info

				for (var f = 0; f < pluginFiles.length; f++) {
					var tiddlers = pluginFiles[f].tiddlers;
					for (var t = 0; t < tiddlers.length; t++) {
						var tiddler = tiddlers[t];
						if (tiddler.title) {
							pluginInfo.tiddlers[tiddler.title] = tiddler;
						}
					}
				}
				// Give the plugin the same version number as the core if it doesn't have one
				if (!("version" in pluginInfo)) {
					pluginInfo.version = $tw.packageInfo.version;
				}
				// Use "plugin" as the plugin-type if we don't have one
				if (!("plugin-type" in pluginInfo)) {
					pluginInfo["plugin-type"] = "plugin";
				}
				pluginInfo.dependents = pluginInfo.dependents || [];
				pluginInfo.type = "application/json";
				// Set plugin text
				pluginInfo.text = JSON.stringify({ tiddlers: pluginInfo.tiddlers }, null, 4);
				delete pluginInfo.tiddlers;
				// Deserialise array fields (currently required for the dependents field)
				for (var field in pluginInfo) {
					if ($tw.utils.isArray(pluginInfo[field])) {
						pluginInfo[field] = $tw.utils.stringifyList(pluginInfo[field]);
					}
				}
				return pluginInfo;
			}))
		}))
	}))
};

function findLibraryItem(this: $TW, name: string, paths: string[]) {
	return from(paths).pipe(
		//add the plugin name to each path and check if it exists
		map(e => path.resolve(e, "./" + name)),
		//if we get an empty string we return a boolean for special processing
		concatMap(pluginPath => obs_stat(this.cloud)()(pluginPath)),
		//find the correct path
		reduce((n, e) => {
			const [err, stat, tag, pluginPath] = e;
			return (!n && (!err && stat && stat.isDirectory())) ? e : n;
		}),
		map(([err, stat, tag, pluginPath]) => (pluginPath))
	);
};

function loadPlugin(this: $TW, name: string, paths: string[], pluginType: string) {
	// first check the installed plugins then check the env directories
	return from(this.cloud.getNamedPlugin(name, pluginType))
		.pipe(mergeMap(pluginInfo =>
			pluginInfo ? of(pluginInfo) : $tw.findLibraryItem(name, paths)
				.pipe(mergeMap(pluginPath => $tw.loadPluginFolder(pluginPath)))
		))
		.pipe(forEach(pluginInfo => $tw.wiki.addTiddler(pluginInfo)))
		.pipe(ignoreElements());
};

function getLibraryItemSearchPaths(this: $TW, libraryPath: string, envVar: string) {
	var pluginPaths: string[] = [/* path.resolve($tw.boot.corePath, libraryPath) */],
		env = window.env && window.env[envVar] as string;
	if (env) {
		env.split(path.delimiter).map((item) => {
			if (item) {
				pluginPaths.push(item)
			}
		});
	}
	return pluginPaths;
};
function loadPlugins(this: $TW, plugins: string[], libraryPath: string, envVar: string, type: string) {
	var pluginPaths = $tw.getLibraryItemSearchPaths(libraryPath, envVar);
	if (plugins)
		return from(plugins).pipe(mergeMap(plugin => $tw.loadPlugin(plugin, pluginPaths, type)));
	else
		return empty();
}

function loadWikiTiddlers(this: $TW, wikiPath: string, options?: any): Observable<TiddlyWikiInfo> {
	options = options || {};
	var parentPaths = options.parentPaths || [],
		wikiInfoPath = path.resolve(wikiPath, $tw.config.wikiInfo);

	return obs_readFile(this.cloud)()(wikiInfoPath, "utf8").pipe(mergeMap(([err, wikiInfoText]) => {
		if (err || !wikiInfoText) throw new Error("wiki info could not be read")
		var wikiInfo = JSON.parse(wikiInfoText);

		// Load the wiki files, registering them as writable
		var resolvedWikiPath = path.resolve(wikiPath, $tw.config.wikiTiddlersSubDir);
		// Save the original tiddler file locations if requested
		var config = wikiInfo.config || {};
		if (config["retain-original-tiddler-path"]) {
			var output: any = {}, relativePath;
			for (var title in $tw.boot.files) {
				relativePath = path.relative(resolvedWikiPath, $tw.boot.files[title].filepath);
				output[title] =
					path.sep === path.posix.sep ?
						relativePath :
						relativePath.split(path.sep).join(path.posix.sep);
			}
			$tw.wiki.addTiddler({ title: "$:/config/OriginalTiddlerPaths", type: "application/json", text: JSON.stringify(output) });
		}
		// Save the path to the tiddlers folder for the filesystemadaptor
		$tw.boot.wikiTiddlersPath = path.resolve($tw.boot.wikiPath, config["default-tiddler-location"] || $tw.config.wikiTiddlersSubDir);

		parentPaths = parentPaths.slice(0);
		parentPaths.push(wikiPath);

		var loadIncludesObs = obs_tw_each((wikiInfo.includeWikis || []))
			.pipe(mergeMap(([info]: [{ path: string }]) => {
				if (typeof info === "string") {
					info = { path: info };
				}
				var resolvedIncludedWikiPath = path.resolve(wikiPath, info.path);
				if (parentPaths.indexOf(resolvedIncludedWikiPath) === -1) {
					return $tw.loadWikiTiddlers(resolvedIncludedWikiPath, {
						parentPaths: parentPaths,
						readOnly: true
					}).pipe(map((subWikiInfo: TiddlyWikiInfo) => {
						// Merge the build targets
						wikiInfo.build = $tw.utils.extend([], subWikiInfo.build, wikiInfo.build);
					}))
				} else {
					$tw.utils.error("Cannot recursively include wiki " + resolvedIncludedWikiPath);
					return empty();
				}
			}))

		var loadWiki = $tw.loadTiddlersFromPath(resolvedWikiPath).pipe(forEach((tiddlerFile) => {
			if (!options.readOnly && tiddlerFile.filepath) {
				$tw.utils.each(tiddlerFile.tiddlers, (tiddler: any) => {
					$tw.boot.files[tiddler.title] = {
						filepath: tiddlerFile.filepath,
						type: tiddlerFile.type,
						hasMetaFile: tiddlerFile.hasMetaFile
					};
				});
			}
			$tw.wiki.addTiddlers(tiddlerFile.tiddlers);
		}), ignoreElements());
		// Load any plugins within the wiki folder
		var loadWikiPlugins = of(
			path.resolve(wikiPath, $tw.config.wikiPluginsSubDir),
			path.resolve(wikiPath, $tw.config.wikiThemesSubDir),
			path.resolve(wikiPath, $tw.config.wikiLanguagesSubDir)
		).pipe(
			mergeMap(wpp => obs_readdir(this.cloud)()(wpp)),
			mergeMap(([err, pluginFolders, tag, wikiPluginsPath]) => {
				if (err) return empty();
				return from(pluginFolders).pipe(
					mergeMap(folder => {
						return $tw.loadPluginFolder(path.resolve(wikiPluginsPath, "./" + folder))
					}),
					forEach(pluginFields => {
						$tw.wiki.addTiddler(pluginFields);
					}),
					ignoreElements()
				);
			})
		);
		return concat(
			// Load includeWikis
			loadIncludesObs,
			// Load any plugins, themes and languages listed in the wiki info file
			merge(
				$tw.loadPlugins(wikiInfo.plugins, $tw.config.pluginsPath, $tw.config.pluginsEnvVar, "plugin"),
				$tw.loadPlugins(wikiInfo.themes, $tw.config.themesPath, $tw.config.themesEnvVar, "theme"),
				$tw.loadPlugins(wikiInfo.languages, $tw.config.languagesPath, $tw.config.languagesEnvVar, "language")
			),
			// Load the wiki folder
			loadWiki,
			loadWikiPlugins
		).pipe(reduce(n => n, wikiInfo));
	}))
};

function loadTiddlersNode(this: $TW) {

	// Load the boot tiddlers
	// $tw.loadTiddlersFromPath($tw.boot.bootPath)
	// 	.subscribe(tiddlerFile => $tw.wiki.addTiddlers(tiddlerFile.tiddlers));
	// Load the core tiddlers
	// $tw.loadPluginFolder($tw.boot.corePath)
	// 	.subscribe(pluginFolder => $tw.wiki.addTiddler(pluginFolder));
	// Load the tiddlers from the wiki directory
	return new Promise(resolve => {
		if ($tw.boot.wikiPath) {
			$tw.loadWikiTiddlers($tw.boot.wikiPath).subscribe((wikiInfo: TiddlyWikiInfo) => {
				$tw.boot.wikiInfo = wikiInfo;
				resolve();
			});
		}
	});

};

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