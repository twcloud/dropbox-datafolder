import { Chooser } from './chooser';
import { files } from 'dropbox';
import { contains, DataFolderState, dumpToArray } from './common';
import { Observable, Subscriber, of, from, OperatorFunction, zip, empty } from 'rxjs';
import { reduce, concatMap, map, mapTo, mergeMap, merge, mergeAll, combineAll, tap, count } from 'rxjs/operators';
import * as path from "path";
import { override } from './async';
import { Stats } from './async-dropbox';

interface MyWindow extends Window {
	[K: string]: any;
}
declare var window: MyWindow;

export function handleDatafolder(chooser: Chooser, stat: files.FileMetadata) {
	// let cloud = chooser.cloud;
	override((window as any).$tw, chooser.cloud);
	let clear = setInterval(() => {
		chooser.status.setStatusMessage(chooser.cloud.requestFinishCount + "/" + chooser.cloud.requestStartCount)
	}, 100);
	var folderPath = path.dirname(stat.path_lower as string);
	console.time('handleDatafolder')
	return chooser.cloud.filesListFolder({ path: folderPath }).then(files => {
		let index = files.findIndex(e => Stats.isFolderMetadata(e) && e.name === "tiddlers");
		if (index === -1)
			return chooser.cloud.filesCreateFolder({ path: path.join(folderPath, "tiddlers") }).catch(() => true)
		else
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
		chooser.status.clearStatusMessage();
	})
}

			//dump the tiddlers into an array
			// .pipe(dumpToArray())
			//determine the tiddlers to be preloaded
			// .pipe(map(tiddlers => {
			// 	state.tiddlersEntries = tiddlers;
			// 	state.preload = [];
			// 	tiddlers.forEach(entry => {
			// 		var ext = entry.name.split('.').pop();
			// 		if (chooser.isFileMetadata(entry) && (entry.name.startsWith('$') || contains(ext, ["tid", "meta"]))) {
			// 			state.preload.push(entry);
			// 		} else if (chooser.isFolderMetadata(entry)) {
			// 			chooser.status.setStatusMessage("TWITS does not support data folders with custom folder schemes");
			// 			throw "folder found in tiddlers folder";
			// 		}
			// 	})
			// }))
			//wait for everything to come through
			// .pipe(dumpToArray())
			//emit the preload entries individually
			// .pipe(mergeMap(() => from(state.preload)))
			//download the actual files
			// .pipe(mergeMap((entry) => chooser.client.filesDownload({ path: entry.path_lower as string })))
			//dump the preload files into an array
			// .pipe(dumpToArray())
			//set state.preload to the new array with file contents
			// .pipe(map((preload: files.FileMetadata[]) => { state.preload = preload; console.log(preload); }))
			//emit the plugin folder types
			// .pipe(mergeMap(() => from(["plugins", "themes", "languages"])))
			//download the entire folder as a zip file
			// .pipe(mergeMap(t => chooser.client.filesDownloadZip({ path: state.folderPath + "/" + t })))
			//process it with some kind of unzip software
			//use modified code from TiddlyServer/lib/boot-node-async.ts to load the plugins as tiddlers
			//seriously? for now let's just focus on getting the tiddlers folder working
			//use the boot code to parse the preloads as tiddlers
			//why on earth am I doing this like this? This is crazy.
			//I think it is the only way to do it. Once I do it I'll figure out what to do different.
			//I like the new rxjs
