"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const async_1 = require("./async");
const async_dropbox_1 = require("./async-dropbox");
function handleDatafolder(chooser, stat) {
    // let cloud = chooser.cloud;
    async_1.override(window.$tw, chooser.cloud);
    let clear = setInterval(() => {
        chooser.status.setStatusMessage(chooser.cloud.requestFinishCount + "/" + chooser.cloud.requestStartCount);
    }, 100);
    var folderPath = path.dirname(stat.path_lower);
    console.time('handleDatafolder');
    return chooser.cloud.filesListFolder({ path: folderPath }).then(files => {
        let index = files.findIndex(e => async_dropbox_1.Stats.isFolderMetadata(e) && e.name === "tiddlers");
        if (index === -1)
            return chooser.cloud.filesCreateFolder({ path: path.join(folderPath, "tiddlers") }).catch(() => true);
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
    });
}
exports.handleDatafolder = handleDatafolder;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9hZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBS0EsNkJBQTZCO0FBQzdCLG1DQUFtQztBQUNuQyxtREFBd0M7QUFPeEMsMEJBQWlDLE9BQWdCLEVBQUUsSUFBd0I7SUFDMUUsNkJBQTZCO0lBQzdCLGdCQUFRLENBQUUsTUFBYyxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDN0MsSUFBSSxLQUFLLEdBQUcsV0FBVyxDQUFDO1FBQ3ZCLE9BQU8sQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsR0FBRyxHQUFHLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQzFHLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNSLElBQUksVUFBVSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFVBQW9CLENBQUMsQ0FBQztJQUN6RCxPQUFPLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUE7SUFDaEMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUs7UUFDcEUsSUFBSSxLQUFLLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUkscUJBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLFVBQVUsQ0FBQyxDQUFDO1FBQ3JGLEVBQUUsQ0FBQyxDQUFDLEtBQUssS0FBSyxDQUFDLENBQUMsQ0FBQztZQUNoQixNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUE7UUFDdEcsSUFBSTtZQUNILE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQy9CLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUNQLE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBQyxPQUFPO1lBQ3pCLE9BQU8sQ0FBQyxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQztZQUNwQyxPQUFPLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDL0IsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxHQUFHLFVBQVUsQ0FBQztZQUN0QyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDL0IsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFDUCxPQUFPLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDbEMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3JCLE9BQU8sQ0FBQyxNQUFNLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztJQUNyQyxDQUFDLENBQUMsQ0FBQTtBQUNILENBQUM7QUExQkQsNENBMEJDO0FBRUUsaUNBQWlDO0FBQ2pDLHVCQUF1QjtBQUN2Qix3Q0FBd0M7QUFDeEMsMEJBQTBCO0FBQzFCLHFDQUFxQztBQUNyQyx1QkFBdUI7QUFDdkIsK0JBQStCO0FBQy9CLDJDQUEyQztBQUMzQywyR0FBMkc7QUFDM0csZ0NBQWdDO0FBQ2hDLGtEQUFrRDtBQUNsRCx3R0FBd0c7QUFDeEcsOENBQThDO0FBQzlDLE1BQU07QUFDTixNQUFNO0FBQ04sTUFBTTtBQUNOLHFDQUFxQztBQUNyQyx1QkFBdUI7QUFDdkIsdUNBQXVDO0FBQ3ZDLDZDQUE2QztBQUM3QywyQkFBMkI7QUFDM0IsaUdBQWlHO0FBQ2pHLHNDQUFzQztBQUN0Qyx1QkFBdUI7QUFDdkIsdURBQXVEO0FBQ3ZELG9HQUFvRztBQUNwRyw4QkFBOEI7QUFDOUIsa0VBQWtFO0FBQ2xFLDBDQUEwQztBQUMxQyw4RkFBOEY7QUFDOUYsNkNBQTZDO0FBQzdDLDRGQUE0RjtBQUM1Riw0RUFBNEU7QUFDNUUscURBQXFEO0FBQ3JELHdEQUF3RDtBQUN4RCx5RkFBeUY7QUFDekYscUJBQXFCIn0=