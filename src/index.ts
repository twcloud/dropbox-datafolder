import { Chooser } from './chooser';
import { handleDatafolder } from './loader';
import { override } from './async';
import { Stats } from './async-dropbox';
import { files } from '../node_modules/dropbox/src';

(window as any).$tw = {
	boot: { suppressBoot: true, files: {} },
	preloadTiddlers: [
		{ title: "$:/core/modules/savers/put.js", text: "" }
	]
};

const url = new URL(location.href);
const options: any = {
	type: decodeURIComponent(url.searchParams.get('type') || ''),
	path: decodeURIComponent(url.searchParams.get('path') || ''),
	user: decodeURIComponent(url.searchParams.get('user') || '')
}
if (url.searchParams.get('source') === "oauth2") {
	options.tokenHash = location.hash;
	console.log(options.tokenHash);
	console.log(location.href);
	location.hash = "";
} else {
	options.hash = location.hash;
	options.tokenHash = localStorage.getItem('devtoken') || '';
}


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
	} else {
		var container = document.createElement('div');
		container.id = 'twits-chooser';
		document.body.appendChild(container);
		var chooser = new Chooser(container, options);
		chooser.loadChooser((stat) => {
			container.style.display = "none";
			chooser.status.setStatusMessage("Loading...");
			chooser.cloud.filesDownload({ path: typeof stat === "string" ? stat : stat.path_lower as string })
				.then(stat => handleDatafolder(chooser, stat));
		});

	}
});
