"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chooser_1 = require("./chooser");
const loader_1 = require("./loader");
const async_1 = require("./async");
window.$tw = {
    boot: { suppressBoot: true, files: {} },
    preloadTiddlers: [
        { title: "$:/core/modules/savers/put.js", text: "" }
    ]
};
const url = new URL(location.href);
const options = {
    type: decodeURIComponent(url.searchParams.get('type') || ''),
    path: decodeURIComponent(url.searchParams.get('path') || ''),
    user: decodeURIComponent(url.searchParams.get('user') || ''),
    hash: location.hash || ''
};
location.hash = "";
window.addEventListener('load', () => {
    if (!options.type) {
        var container = document.createElement('div');
        container.id = "twits-greeting";
        container.innerHTML = `
	<h1>
		TiddlyWiki in the Sky<br> on Dropbox <span class="twits-beta">beta</span> <br/> (by <a href="https://github.com/Arlen22">@Arlen22</a>*)
	</h1>
	<p>
		This app enables you to directly edit TiddlyWiki data folders and files stored in your Dropbox. 
		It runs entirely in your browser so we never upload it anywhere except directly to your Dropbox account. 
	</p>
	<div id="twits-selector">
		<a class="access-full button" href="?type=full">Full Dropbox Access</a>
		<a class="access-apps button" href="?type=apps">Apps Folder Access</a>
	</div>`;
        document.body.appendChild(container);
    }
    else {
        var container = document.createElement('div');
        container.classList.add('twits-chooser');
        document.body.appendChild(container);
        var chooser = new chooser_1.Chooser(container, options);
        chooser.loadChooser((stat) => {
            container.style.display = "none";
            chooser.status.setStatusMessage("Loading...");
            Promise.resolve((typeof stat === "string") ? chooser.client.filesGetMetadata({ path: stat }) : stat).then(stat => {
                let cloud = async_1.override(window.$tw, chooser.client).cloud;
                let clear = setInterval(() => { chooser.status.setStatusMessage(cloud.requestFinishCount + "/" + cloud.requestStartCount); }, 100);
                if (!chooser.isFileMetadata(stat)) {
                    chooser.status.setStatusMessage("Invalid file selected");
                    throw "Invalid file selected";
                }
                return loader_1.handleDatafolder(chooser, stat).then(() => {
                    clearInterval(clear);
                });
            });
        });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHVDQUFvQztBQUNwQyxxQ0FBNEM7QUFDNUMsbUNBQW1DO0FBRWxDLE1BQWMsQ0FBQyxHQUFHLEdBQUc7SUFDckIsSUFBSSxFQUFFLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFO0lBQ3ZDLGVBQWUsRUFBRTtRQUNoQixFQUFFLEtBQUssRUFBRSwrQkFBK0IsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFO0tBQ3BEO0NBQ0QsQ0FBQztBQUVGLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNuQyxNQUFNLE9BQU8sR0FBRztJQUNmLElBQUksRUFBRSxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDNUQsSUFBSSxFQUFFLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUM1RCxJQUFJLEVBQUUsa0JBQWtCLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO0lBQzVELElBQUksRUFBRSxRQUFRLENBQUMsSUFBSSxJQUFJLEVBQUU7Q0FDekIsQ0FBQTtBQUNELFFBQVEsQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDO0FBRW5CLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUU7SUFFL0IsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNuQixJQUFJLFNBQVMsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzlDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsZ0JBQWdCLENBQUM7UUFDaEMsU0FBUyxDQUFDLFNBQVMsR0FBRzs7Ozs7Ozs7Ozs7UUFXaEIsQ0FBQztRQUNQLFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3RDLENBQUM7SUFBQyxJQUFJLENBQUMsQ0FBQztRQUNQLElBQUksU0FBUyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDOUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDekMsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDckMsSUFBSSxPQUFPLEdBQUcsSUFBSSxpQkFBTyxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUM5QyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsSUFBSTtZQUN4QixTQUFTLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUM7WUFDakMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUM5QyxPQUFPLENBQUMsT0FBTyxDQUNkLENBQUMsT0FBTyxJQUFJLEtBQUssUUFBUSxDQUFDLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FDbkYsQ0FBQyxJQUFJLENBQUMsSUFBSTtnQkFDVixJQUFJLEtBQUssR0FBRyxnQkFBUSxDQUFFLE1BQWMsQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQztnQkFDaEUsSUFBSSxLQUFLLEdBQUcsV0FBVyxDQUFDLFFBQVEsT0FBTyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLEdBQUcsR0FBRyxHQUFHLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUNsSSxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNuQyxPQUFPLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLHVCQUF1QixDQUFDLENBQUM7b0JBQ3pELE1BQU0sdUJBQXVCLENBQUM7Z0JBQy9CLENBQUM7Z0JBQ0QsTUFBTSxDQUFDLHlCQUFnQixDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUM7b0JBQzNDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFFdEIsQ0FBQyxDQUFDLENBQUE7WUFDSCxDQUFDLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUosQ0FBQztBQUNGLENBQUMsQ0FBQyxDQUFDIn0=