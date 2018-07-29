"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const async_1 = require("./async");
const async_dropbox_1 = require("./async-dropbox");
function handleDatafolder(chooser, stat) {
    let cloud = async_1.override(window.$tw, chooser.client, stat.path_lower).cloud;
    let clear = setInterval(() => { chooser.status.setStatusMessage(cloud.requestFinishCount + "/" + cloud.requestStartCount); }, 100);
    var folderPath = path.dirname(stat.path_lower);
    console.time('handleDatafolder');
    return cloud.filesListFolder({ path: folderPath }).then(files => {
        let index = files.findIndex(e => async_dropbox_1.Stats.isFolderMetadata(e) && e.name === "tiddlers");
        return Promise.resolve((index === -1)
            ? chooser.client.filesCreateFolder({ path: path.join(folderPath, "tiddlers") }).catch(() => true)
            : {});
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9hZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBS0EsNkJBQTZCO0FBQzdCLG1DQUFtQztBQUNuQyxtREFBNkQ7QUFPN0QsMEJBQWlDLE9BQWdCLEVBQUUsSUFBd0I7SUFDMUUsSUFBSSxLQUFLLEdBQUcsZ0JBQVEsQ0FBRSxNQUFjLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEtBQUssQ0FBQztJQUNqRixJQUFJLEtBQUssR0FBRyxXQUFXLENBQUMsUUFBUSxPQUFPLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxrQkFBa0IsR0FBRyxHQUFHLEdBQUcsS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUEsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDbEksSUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsVUFBb0IsQ0FBQyxDQUFDO0lBQ3pELE9BQU8sQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtJQUNoQyxNQUFNLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLO1FBQzVELElBQUksS0FBSyxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLHFCQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxVQUFVLENBQUMsQ0FBQztRQUNyRixNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssS0FBSyxDQUFDLENBQUMsQ0FBQztjQUNsQyxPQUFPLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxJQUFJLENBQUM7Y0FDL0YsRUFBUyxDQUFDLENBQUM7SUFDZixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFDUCxNQUFNLENBQUMsSUFBSSxPQUFPLENBQUMsT0FBTztZQUN6QixPQUFPLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUM7WUFDcEMsT0FBTyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBQy9CLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsR0FBRyxVQUFVLENBQUM7WUFDdEMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQy9CLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQ1AsT0FBTyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ2xDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNyQixPQUFPLENBQUMsTUFBTSxDQUFDLGtCQUFrQixFQUFFLENBQUM7SUFDckMsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDO0FBdEJELDRDQXNCQztBQUVFLGlDQUFpQztBQUNqQyx1QkFBdUI7QUFDdkIsd0NBQXdDO0FBQ3hDLDBCQUEwQjtBQUMxQixxQ0FBcUM7QUFDckMsdUJBQXVCO0FBQ3ZCLCtCQUErQjtBQUMvQiwyQ0FBMkM7QUFDM0MsMkdBQTJHO0FBQzNHLGdDQUFnQztBQUNoQyxrREFBa0Q7QUFDbEQsd0dBQXdHO0FBQ3hHLDhDQUE4QztBQUM5QyxNQUFNO0FBQ04sTUFBTTtBQUNOLE1BQU07QUFDTixxQ0FBcUM7QUFDckMsdUJBQXVCO0FBQ3ZCLHVDQUF1QztBQUN2Qyw2Q0FBNkM7QUFDN0MsMkJBQTJCO0FBQzNCLGlHQUFpRztBQUNqRyxzQ0FBc0M7QUFDdEMsdUJBQXVCO0FBQ3ZCLHVEQUF1RDtBQUN2RCxvR0FBb0c7QUFDcEcsOEJBQThCO0FBQzlCLGtFQUFrRTtBQUNsRSwwQ0FBMEM7QUFDMUMsOEZBQThGO0FBQzlGLDZDQUE2QztBQUM3Qyw0RkFBNEY7QUFDNUYsNEVBQTRFO0FBQzVFLHFEQUFxRDtBQUNyRCx3REFBd0Q7QUFDeEQseUZBQXlGO0FBQ3pGLHFCQUFxQiJ9