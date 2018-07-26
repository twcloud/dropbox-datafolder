"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chooser_1 = require("./chooser");
const loader_1 = require("./loader");
const boot_node_async_1 = require("./boot-node-async");
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
            Promise.resolve((typeof stat === "string") ? chooser.client.filesGetMetadata({ path: stat }) : stat).then(stat => {
                boot_node_async_1.override(window.$tw, chooser.client);
                if (!chooser.isFileMetadata(stat)) {
                    chooser.status.setStatusMessage("Invalid file selected");
                    throw "Invalid file selected";
                }
                return loader_1.handleDatafolder(chooser, stat);
            });
        });
    }
});
