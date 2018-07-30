// import { files, Dropbox, Error } from 'dropbox';
import { Observable, of, asyncScheduler, from, empty, merge, zip, concat, throwError, OperatorFunction } from 'rxjs';
// import { dbx_filesListFolder, GetMetadataResult, dumpToArray, TiddlyWikiInfo } from '../src/common';
import {
	map, mergeMap, reduce, ignoreElements, concatMap, catchError,
	zipAll, tap, count, mapTo, startWith, find, first
} from 'rxjs/operators';
import * as path from 'path';
import { Buffer } from "buffer";

import { obs_exists, obs_readdir, obs_readFile, obs_stat, Container, ENV, CloudObject } from './async-dropbox';
import { inspect, debug } from 'util';
import { dumpToArray } from './common';
export { CloudObject };
type Hashmap<T = any> = { [K: string]: T }

function tlog<T>(a: T): T {
	console.log(a);
	return a;
}

// export const obs_readFile =
declare var window: Window & { env: any };

export function startup_patch($tw: any, options: any = {}) {
	$tw.crypto = new $tw.utils.Crypto();
	// options = options || {};
	// Get the URL hash and check for safe mode
	$tw.locationHash = "#";
	if ($tw.browser && !$tw.node) {
		if (location.hash === "#:safe") {
			$tw.safeMode = true;
		} else {
			$tw.locationHash = $tw.utils.getLocationHash();
		}
	}
	// Initialise some more $tw properties
	$tw.utils.deepDefaults($tw, {
		modules: { // Information about each module
			titles: Object.create(null), // hashmap by module title of {fn:, exports:, moduleType:}
			types: {} // hashmap by module type of hashmap of exports
		},
		config: { // Configuration overridables
			pluginsPath: "../plugins/",
			themesPath: "../themes/",
			languagesPath: "../languages/",
			editionsPath: "../editions/",
			wikiInfo: "./tiddlywiki.info",
			wikiPluginsSubDir: "./plugins",
			wikiThemesSubDir: "./themes",
			wikiLanguagesSubDir: "./languages",
			wikiTiddlersSubDir: "./tiddlers",
			wikiOutputSubDir: "./output",
			jsModuleHeaderRegExpString: "^\\/\\*\\\\(?:\\r?\\n)((?:^[^\\r\\n]*(?:\\r?\\n))+?)(^\\\\\\*\\/$(?:\\r?\\n)?)",
			fileExtensionInfo: Object.create(null), // Map file extension to {type:}
			contentTypeInfo: Object.create(null), // Map type to {encoding:,extension:}
			pluginsEnvVar: "TIDDLYWIKI_PLUGIN_PATH",
			themesEnvVar: "TIDDLYWIKI_THEME_PATH",
			languagesEnvVar: "TIDDLYWIKI_LANGUAGE_PATH",
			editionsEnvVar: "TIDDLYWIKI_EDITION_PATH"
		},
		log: {}, // Log flags
		unloadTasks: []
	});
	if (!$tw.boot.tasks.readBrowserTiddlers) {
		// For writable tiddler files, a hashmap of title to {filepath:,type:,hasMetaFile:}
		$tw.boot.files = Object.create(null);
		// System paths and filenames
		$tw.boot.bootPath = options.bootPath || path.dirname(module.filename);
		$tw.boot.corePath = path.resolve($tw.boot.bootPath, "../core");
		// If there's no arguments then default to `--help`
		if ($tw.boot.argv.length === 0) {
			$tw.boot.argv = ["--help"];
		}
		// If the first command line argument doesn't start with `--` then we
		// interpret it as the path to the wiki folder, which will otherwise default
		// to the current folder
		if ($tw.boot.argv[0] && $tw.boot.argv[0].indexOf("--") !== 0) {
			$tw.boot.wikiPath = $tw.boot.argv[0];
			$tw.boot.argv = $tw.boot.argv.slice(1);
		} else {
			$tw.boot.wikiPath = process.cwd();
		}
		// Read package info
		$tw.packageInfo = $tw.packageInfo || require("../twits-5-1-17/package.json");
		// Check node version number
		if (!$tw.utils.checkVersions(process.version.substr(1), $tw.packageInfo.engines.node.substr(2))) {
			$tw.utils.error("TiddlyWiki5 requires node.js version " + $tw.packageInfo.engines.node);
		}
	}
	// Add file extension information
	$tw.utils.registerFileType("text/vnd.tiddlywiki", "utf8", ".tid");
	$tw.utils.registerFileType("application/x-tiddler", "utf8", ".tid");
	$tw.utils.registerFileType("application/x-tiddlers", "utf8", ".multids");
	$tw.utils.registerFileType("application/x-tiddler-html-div", "utf8", ".tiddler");
	$tw.utils.registerFileType("text/vnd.tiddlywiki2-recipe", "utf8", ".recipe");
	$tw.utils.registerFileType("text/plain", "utf8", ".txt");
	$tw.utils.registerFileType("text/css", "utf8", ".css");
	$tw.utils.registerFileType("text/html", "utf8", [".html", ".htm"]);
	$tw.utils.registerFileType("application/hta", "utf16le", ".hta", { deserializerType: "text/html" });
	$tw.utils.registerFileType("application/javascript", "utf8", ".js");
	$tw.utils.registerFileType("application/json", "utf8", ".json");
	$tw.utils.registerFileType("application/pdf", "base64", ".pdf", { flags: ["image"] });
	$tw.utils.registerFileType("application/zip", "base64", ".zip");
	$tw.utils.registerFileType("image/jpeg", "base64", [".jpg", ".jpeg"], { flags: ["image"] });
	$tw.utils.registerFileType("image/png", "base64", ".png", { flags: ["image"] });
	$tw.utils.registerFileType("image/gif", "base64", ".gif", { flags: ["image"] });
	$tw.utils.registerFileType("image/svg+xml", "utf8", ".svg", { flags: ["image"] });
	$tw.utils.registerFileType("image/x-icon", "base64", ".ico", { flags: ["image"] });
	$tw.utils.registerFileType("application/font-woff", "base64", ".woff");
	$tw.utils.registerFileType("application/x-font-ttf", "base64", ".woff");
	$tw.utils.registerFileType("audio/ogg", "base64", ".ogg");
	$tw.utils.registerFileType("video/mp4", "base64", ".mp4");
	$tw.utils.registerFileType("audio/mp3", "base64", ".mp3");
	$tw.utils.registerFileType("audio/mp4", "base64", [".mp4", ".m4a"]);
	$tw.utils.registerFileType("text/markdown", "utf8", [".md", ".markdown"], { deserializerType: "text/x-markdown" });
	$tw.utils.registerFileType("text/x-markdown", "utf8", [".md", ".markdown"]);
	$tw.utils.registerFileType("application/enex+xml", "utf8", ".enex");
	$tw.utils.registerFileType("application/vnd.openxmlformats-officedocument.wordprocessingml.document", "base64", ".docx");
	$tw.utils.registerFileType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "base64", ".xlsx");
	$tw.utils.registerFileType("application/vnd.openxmlformats-officedocument.presentationml.presentation", "base64", ".pptx");
	$tw.utils.registerFileType("application/x-bibtex", "utf8", ".bib");
	$tw.utils.registerFileType("application/epub+zip", "base64", ".epub");
	// Create the wiki store for the app
	$tw.wiki = new $tw.Wiki();
	// Install built in tiddler fields modules
	$tw.Tiddler.fieldModules = $tw.modules.getModulesByTypeAsHashmap("tiddlerfield");
	// Install the tiddler deserializer modules
	$tw.Wiki.tiddlerDeserializerModules = Object.create(null);
	$tw.modules.applyMethods("tiddlerdeserializer", $tw.Wiki.tiddlerDeserializerModules);
}

export function override(_$tw: any, cloud: CloudObject) {
	var $tw: $TW = _$tw;
	interface $TW extends Container {
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
		[K: string]: any;
	}


	// declare const $tw: $TW;
	function obs_tw_each<T>(obj: { [K: string]: T }): Observable<[T, string]>;
	function obs_tw_each<T>(obj: T[]): Observable<[T, number]>;
	function obs_tw_each(obj: any) {
		return new Observable(subs => {
			$tw.utils.each(obj, (item: any, index: any) => { subs.next([item, index]); });
			subs.complete();
		});
	}

	const isArray = Array.isArray;
	// =======================================================

	interface TiddlerFileInfo {
		tiddlers: any[],
		filepath?: string,
		type?: string,
		hasMetaFile?: boolean
	}
	interface TiddlyWikiInfo {
		plugins: string[];
		themes: string[];
		languages: string[];
		includeWiki: string[];
		build: any[];
	}
	function loadTiddlersFromFile(this: $TW, filepath: string, fields: any) {
		//get the type info for this extension
		var ext = path.extname(filepath),
			extensionInfo = $tw.utils.getFileExtensionInfo(ext),
			type = extensionInfo ? extensionInfo.type : null,
			typeInfo = type ? $tw.config.contentTypeInfo[type] : null;
		//read the file without checking if it exists
		return obs_readFile(this)()(filepath, typeInfo ? typeInfo.encoding : "utf8").pipe(
			//parse the tiddlers in the file
			tap(([err]) => { if (err) { throw err; } }),
			map(([err, data]) => $tw.wiki.deserializeTiddlers(ext, data, fields)),
			mergeMap(tiddlers =>
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
		return obs_exists(this)()(filepath + ".meta").pipe(
			mergeMap(([exists, tag, metafilename]) =>
				exists ? obs_readFile(this)()(metafilename, "utf8") : of(false)),
			map((data) => data && $tw.utils.parseFields(data[1]))
		)
	}


	function loadTiddlersFromPath(this: $TW, filepath: string, excludeRegExp: RegExp = $tw.boot.excludeRegExp): Observable<TiddlerFileInfo> {
		//stat the filepath
		return obs_stat(this)()(filepath).pipe(mergeMap(([err, stat, tag]) => !!err ? empty() : (stat.isDirectory())
			//if we have a directory, read the files
			? obs_readdir(this)()(filepath).pipe(
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
	type ProcessFileInput = { filename: string, isTiddlerFile: boolean, fields: any, prefix: string, suffix: string };
	/**
	 * This very crazy function should actually be the correct translation of processfile
	 */

	function loadTiddlersFromSpecification(this: $TW, filepath: string, excludeRegExp: RegExp): Observable<TiddlerFileInfo> {
		function ProcessFile(self: $TW, filepath: string) {
			function getFieldValue(tiddler: Hashmap<any>, name: string, fieldInfo: { source: string }, filename: string, pathname: string) {
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
						return obs_stat(self)()(pathname).pipe(map(([err, stat]) => new Date(stat.birthtime)));
					case "modified":
						return obs_stat(self)()(pathname).pipe(map(([err, stat]) => new Date(stat.mtime)));
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
					obs_readFile(self)()(pathname, typeInfo.encoding || "utf8"),
					$tw.loadMetadataForFile(pathname)
				).pipe(
					//if there is an error reading the file, then throw it
					tap(([[err]]) => { if (err) throw err }),
					//deserialize and combine the result
					map(([[err, text], metadata]) => [
						((isTiddlerFile)
							? ($tw.wiki.deserializeTiddlers(path.extname(pathname), text, metadata))
							: ([$tw.utils.extend({ text }, metadata || {})])),
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

		type DirSpec = (string | { path: string, filesRegExp?: string, isTiddlerFile: boolean, fields: any });

		return obs_readFile(this)()(filepath + path.sep + "tiddlywiki.files", "utf8").pipe(map(([err, data]): any => {
			if (err || !data) throw "Error reading tiddlywiki.files";
			return JSON.parse(data);
		}), mergeMap((filesInfo) => concat(
			//first load the specified tiddlers
			obs_tw_each(filesInfo.tiddlers as any[]).pipe(map(([tidInfo]) => {
				const { file: filename, isTiddlerFile, fields } = tidInfo;
				if (tidInfo.prefix && tidInfo.suffix) {
					tidInfo.fields.text = { prefix: tidInfo.prefix, suffix: tidInfo.suffix };
				} else if (tidInfo.prefix) {
					tidInfo.fields.text = { prefix: tidInfo.prefix };
				} else if (tidInfo.suffix) {
					tidInfo.fields.text = { suffix: tidInfo.suffix };
				}
				return { filename, isTiddlerFile, fields };
			}), ProcessFile(this, filepath)),
			//then load the specified directories
			obs_tw_each(filesInfo.directories as DirSpec[]).pipe(mergeMap(([dirSpec]) => {
				if (typeof dirSpec === "string") {
					//if the dirSpec is a string, we load the path
					return obs_stat(this)(dirSpec)(path.resolve(filepath, dirSpec))
						.pipe(mergeMap(([err, stat, dirSpec, pathname]) =>
							(!err && stat.isDirectory()) ? $tw.loadTiddlersFromPath(pathname, excludeRegExp) : empty()
						))
				} else {
					//if it is an object there is more to the story
					const fileRegExp = new RegExp(dirSpec.filesRegExp || "^.*$"), metaRegExp = /^.*\.meta$/;
					const dirPath = path.resolve(filepath, dirSpec.path);
					const { isTiddlerFile, fields } = dirSpec;
					return obs_readdir(this)()(dirPath).pipe(
						//filter the list of files to only load the valid ones
						mergeMap(([err, files, tag, dirPath]) => from(files.filter(filename =>
							filename !== "tiddlywiki.files" && !metaRegExp.test(filename) && fileRegExp.test(filename)
						))),
						//map each file to the processFile input arguments
						map(filename => { return { filename: dirPath + path.sep + filename, isTiddlerFile, fields } }),
						//process the file to get the tiddlers from it
						ProcessFile(this, filepath)
					)
				}
			}))
		)))
	}
	type PluginTiddler = {};
	function loadPluginFolder(this: $TW, filepath_source: Observable<string>, excludeRegExp: RegExp = $tw.boot.excludeRegExp): Observable<PluginTiddler> {
		return filepath_source.pipe(
			//if no plugin is found, the source will emit an empty string
			mergeMap(filepath => !filepath ? empty() : zip(
				obs_stat(this)()(filepath),
				obs_stat(this)()(filepath + path.sep + "plugin.info"))
			),
			//check the stats and return empty if we aren't loading anything
			mergeMap(([[err1, stat1, tag1, filepath], [err2, stat2, tag2, infoPath]]) => {
				if (err1 || !stat1.isDirectory()) return empty();
				if (err2 || !stat2.isFile()) {
					console.log("Warning: missing plugin.info file in " + filepath);
					return empty();
				}
				return obs_readFile(this)(filepath)(infoPath, "utf8");
			}),
			//parse the plugin info and load the folder
			mergeMap(([err, plugindata, filepath]) => {
				//here we throw because this should not happen
				if (err || !plugindata) throw new Error("Error: missing plugin.info file in " + filepath)
				const pluginInfo = JSON.parse(plugindata);
				pluginInfo.tiddlers = pluginInfo.tiddlers || Object.create(null);
				return $tw.loadTiddlersFromPath(filepath, excludeRegExp).pipe(
					tap(pluginFile => {
						pluginFile.tiddlers.forEach(tiddler => {
							pluginInfo.tiddlers[tiddler.title] = tiddler;
						})
					}),
					//wait until all the tiddlers have been loaded
					count(),
					//finish processing the pluginInfo file
					map(() => {
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
					})
				)
			})
		);
	}

	function findLibraryItem(this: $TW, name: string, paths: string[]) {
		return from(paths.map(e => path.resolve(e, "./" + name))).pipe(
			mergeMap(pluginPath => obs_stat(this)()(pluginPath)),
			find(e => !e[0] && e[1].isDirectory()),
			map(res => res && res[3]),
		)
	}

	function loadPlugin(this: $TW, name: string, paths: string[], pluginType: string) {
		return from(this.getNamedPlugin(name, pluginType)).pipe(
			mergeMap(pluginInfo => pluginInfo ? of(pluginInfo) : $tw.loadPluginFolder($tw.findLibraryItem(name, paths))),
			// tap(pluginInfo => $tw.wiki.addTiddler(pluginInfo)),
			// ignoreElements()
		);
	}

	function getLibraryItemSearchPaths(this: $TW, libraryPath: string, envVar: string) {
		var pluginPaths: string[] = [/* path.resolve($tw.boot.corePath, libraryPath) */], env = ENV[envVar];
		if (env) env.split(path.delimiter).map((item) => { if (item) pluginPaths.push(item); });
		return pluginPaths;
	}

	function loadPlugins(this: $TW, plugins: string[], libraryPath: string, envVar: string, type: string) {
		var pluginPaths = $tw.getLibraryItemSearchPaths(libraryPath, envVar);
		if (plugins) return from(plugins).pipe(mergeMap(plugin => $tw.loadPlugin(plugin, pluginPaths, type)));
		else return empty();
	}

	function loadWikiTiddlers(this: $TW, wikiPath: string, options: any = {}): Observable<TiddlyWikiInfo> {
		var parentPaths = options.parentPaths || [];
		var resolvedWikiPath = path.resolve(wikiPath, $tw.config.wikiTiddlersSubDir);

		return zip(
			obs_readFile(this)()(path.resolve(wikiPath, $tw.config.wikiInfo), "utf8"),
			obs_readdir(this)()(path.resolve(wikiPath)) //read this to prime the cache
		).pipe(
			map(([[err, data, t, wikiInfoPath]]) => {
				if (err || !data) throw "Error loading the " + $tw.config.wikiInfo + " file";
				else return JSON.parse(data);
			}),
			mergeMap(wikiInfo => {
				parentPaths = parentPaths.slice(0);
				parentPaths.push(wikiPath);
				const includeWikis = obs_tw_each(wikiInfo.includeWikis).pipe(
					map(([info]) => path.resolve(wikiPath, typeof info === "object" ? (info as any).path : info)),
					concatMap((resolvedIncludedWikiPath) => {
						if (parentPaths.indexOf(resolvedIncludedWikiPath) === -1) {
							return $tw.loadWikiTiddlers(resolvedIncludedWikiPath, {
								parentPaths: parentPaths,
								readOnly: true
							}).pipe(tap((subWikiInfo: any) => {
								wikiInfo.build = $tw.utils.extend([], subWikiInfo.build, wikiInfo.build);
							}), ignoreElements())
						} else {
							$tw.utils.error("Cannot recursively include wiki " + resolvedIncludedWikiPath);
							return empty();
						}
					})
				)

				var loadWiki = $tw.loadTiddlersFromPath(resolvedWikiPath).pipe(tap((tiddlerFile) => {
					if (!options.readOnly && tiddlerFile.filepath) {
						$tw.utils.each(tiddlerFile.tiddlers, (tiddler: any) => {
							$tw.boot.files[tiddler.title] = {
								filepath: tiddlerFile.filepath,
								type: tiddlerFile.type,
								hasMetaFile: tiddlerFile.hasMetaFile
							};
						});
					}
					$tw.wiki.addTiddlers(tiddlerFile.tiddlers)
				}), count(), map(() => {
					// Save the original tiddler file locations if requested
					var config = wikiInfo.config || {};
					if (config["retain-original-tiddler-path"]) {
						var output: Hashmap = {}, relativePath;
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

				}), ignoreElements());

				// Load any plugins within the wiki folder
				var wikiFolderPlugins: any[] = [];
				var wikiFolderPluginsLoader = of(
					["plugins", path.resolve(wikiPath, $tw.config.wikiPluginsSubDir)],
					["themes", path.resolve(wikiPath, $tw.config.wikiThemesSubDir)],
					["languages", path.resolve(wikiPath, $tw.config.wikiLanguagesSubDir)]
				).pipe(
					mergeMap(([type, wpp]) => obs_exists(this)(type)(wpp)),
					mergeMap(([exists, type, wpp]) => exists ? obs_readdir(this)(type)(wpp) : empty()),
					mergeMap(([err, pluginFolders, pluginType, wikiPluginsPath]) => err ? empty() : from(pluginFolders).pipe(
						mergeMap(folder => $tw.loadPluginFolder(of(path.resolve(wikiPluginsPath, "./" + folder))))
					))
				).forEach((pluginInfo) => {
					wikiFolderPlugins.push(pluginInfo);
				});

				var wikiInfoPlugins: any[] = [];
				var wikiInfoPluginsLoader = merge( // Load any plugins, themes and languages listed in the wiki info file
					$tw.loadPlugins(wikiInfo.plugins, $tw.config.pluginsPath, $tw.config.pluginsEnvVar, "plugin"),
					$tw.loadPlugins(wikiInfo.themes, $tw.config.themesPath, $tw.config.themesEnvVar, "theme"),
					$tw.loadPlugins(wikiInfo.languages, $tw.config.languagesPath, $tw.config.languagesEnvVar, "language")
				).forEach((pluginInfo) => {
					wikiInfoPlugins.push(pluginInfo);
				});

				return concat(
					Promise.all([
						wikiInfoPluginsLoader, 
						wikiFolderPluginsLoader, 
						includeWikis.forEach(() => {}),
						obs_readdir(this)()(resolvedWikiPath).forEach(() => {})
					]),
					from(wikiInfoPlugins).pipe(tap(plugin => $tw.wiki.addTiddler(plugin))),
					loadWiki,
					from(wikiFolderPlugins).pipe(tap(plugin => $tw.wiki.addTiddler(plugin))),
				).pipe(count(), mapTo(wikiInfo));
			})
		)
	}
	function loadTiddlersNode(this: $TW) {
		// Load the boot tiddlers
		return $tw.loadWikiTiddlers($tw.boot.wikiPath).forEach(wikiInfo => {
			$tw.boot.wikiInfo = wikiInfo;
		});
		// return merge(
		// 	$tw.loadTiddlersFromPath($tw.boot.bootPath).pipe(tap(tiddlerFile =>
		// 		$tw.wiki.addTiddlers(tiddlerFile.tiddlers)
		// 	)),
		// 	$tw.loadPluginFolder(of($tw.boot.corePath)).pipe(tap(pluginInfo =>
		// 		$tw.wiki.addTiddler(pluginInfo)
		// 	)),
		// 	$tw.loadWikiTiddlers($tw.boot.wikiPath).pipe(tap(wikiInfo =>
		// 		$tw.boot.wikiInfo = wikiInfo
		// 	))
		// ).pipe(ignoreElements())
	}
	// =======================================================

	const container = new Container<$TW>(cloud);
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
	return container;
}

