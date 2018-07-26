import { Chooser } from './chooser';
import { files } from '../node_modules/dropbox/src';
import { contains, TiddlyWikiInfo, DataFolderState, dumpToArray } from './common';
import { Observable, Subscriber, of, from, OperatorFunction } from 'rxjs';
import { reduce, concatMap, map, mapTo, mergeMap, merge, mergeAll, combineAll } from 'rxjs/operators';


function dbx_filesListFolder(chooser: Chooser, folderPath: string) {
	return new Observable<(files.FileMetadataReference | files.FolderMetadataReference | files.DeletedMetadataReference)>(sub => {
		chooser.streamFilesListFolder(folderPath, (ents, more) => {
			ents.forEach(e => sub.next(e));
			if (!more)
				sub.complete();
		});
	});
}


// type t = OperatorFunction
export function handleDatafolder(chooser: Chooser, stat: files.FileMetadata) {
	// if (!stat.path_lower) throw "stat did not contain a path_lower property";
	var folder = (stat.path_lower as string).split('/');
	console.log('folder pop', folder.pop());
	var folderPath = folder.join('/');
	var state: DataFolderState = {
		folderPath,
		folderEntries: [],
		has: {},
		info: { stat, json: undefined }
	} as any;
	return new Promise(resolve => {


		//download the tiddlywiki.info file
		from(chooser.client.filesDownload({ path: stat.path_lower as string }))
			//fetch the blob content then list the folder
			.pipe(mergeMap((file: files.FileMetadata & { fileBlob: Blob }) => {
				return fetch(URL.createObjectURL(file.fileBlob)).then(res => {
					res.text().then(text => { state.info.json = JSON.parse(text); })
					return dbx_filesListFolder(chooser, folderPath)
				});
			}))
			//the promise returns an observable, so we need to consume it
			.pipe(mergeAll())
			//say what features the folder has
			.pipe(map((ent, i) => {
				if (chooser.isFileMetadata(ent)) {
					if (ent.name === "tiddlywiki.info") state.has["info"] = true;
				} else if (chooser.isFolderMetadata(ent)) {
					type HAS_KEYT = keyof DataFolderState["has"];
					if (contains<HAS_KEYT>(ent.name, ["plugins", "themes", "languages", "tiddlers"])) {
						state.has[ent.name] = true;
					}
				}
				return ent;
			}))
			//dump the folder entries to an array
			.pipe(dumpToArray())
			//list the tiddlers folder if it has one, otherwise throw
			.pipe(concatMap((entries: any) => {
				state.folderEntries = entries
				if (!state.has.tiddlers) {
					chooser.status.setStatusMessage("There is no tiddlers folder");
					throw "there is no tiddlers folder";
				}
				return dbx_filesListFolder(chooser, state.folderPath + "/tiddlers")
			}))
			//dump the tiddlers into an array
			.pipe(dumpToArray())
			//determine the tiddlers to be preloaded
			.pipe(map(tiddlers => {
				state.tiddlersEntries = tiddlers;
				state.preload = [];
				tiddlers.forEach(entry => {
					var ext = entry.name.split('.').pop();
					if (chooser.isFileMetadata(entry) && (entry.name.startsWith('$') || contains(ext, ["tid", "meta"]))) {
						state.preload.push(entry);
					} else if (chooser.isFolderMetadata(entry)) {
						chooser.status.setStatusMessage("TWITS does not support data folders with custom folder schemes");
						throw "folder found in tiddlers folder";
					}
				})
			}))
			//wait for everything to come through
			.pipe(dumpToArray())
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
			.subscribe(() => {
				console.log('booting', chooser, state);
				chooser.status.setStatusMessage("Loading tiddlywiki");
				setTimeout(() => {
					(window as any).$tw.boot.wikiPath = state.folderPath;
					(window as any).$tw.boot.boot(resolve);
				});
			});
	}).then(() => { chooser.status.clearStatusMessage(); })

}