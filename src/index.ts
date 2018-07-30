import { Chooser, getAppKey } from './chooser';
import { handleDatafolder } from './loader';
import { override } from './async';
import { Stats } from './async-dropbox';
import { files, Dropbox } from 'dropbox';

(window as any).$tw = {
	boot: { suppressBoot: true, files: {} },
	preloadTiddlers: [
		{ title: "$:/core/modules/savers/put.js", text: "" }
	]
};

const url = new URL(location.href);
let options: any = {
	type: decodeURIComponent(url.searchParams.get('type') || ''),
	path: decodeURIComponent(url.searchParams.get('path') || ''),
	user: decodeURIComponent(url.searchParams.get('user') || '')
}
const OPTIONS_CACHE_KEY = "twits-options"
if (url.searchParams.get('source') === "oauth2") {
	//parse the oauth token
	options.token = {};
	let hashtoken = location.hash;
	if (hashtoken.startsWith("#")) hashtoken = hashtoken.slice(1);
	hashtoken.split('&').map((item: any) => {
		let part = item.split('=');
		options.token[part[0]] = decodeURIComponent(part[1]);
	});
	//parse the state, store everything, and redirect back to ?type=%type
	let { path, user, type, hash } = JSON.parse(decodeURIComponent(options.token.state) || '{}');
	if(type === options.type){
		options.path = path;
		options.user = user;	
	}
	if (!hash.startsWith("#")) hash = "#" + hash;
	sessionStorage.setItem(OPTIONS_CACHE_KEY, JSON.stringify(options));
	location.href = location.origin + location.pathname + "?type=" + options.type + hash;
} else {
	let store = sessionStorage.getItem(OPTIONS_CACHE_KEY);
	sessionStorage.setItem(OPTIONS_CACHE_KEY, "");
	//if we have stored options, ignore anything else
	if (store) options = JSON.parse(store);
	options.hash = location.hash;
	if (!(options.token && options.token.access_token)) {
		if (options.type !== "full" && options.type !== "apps") throw "Invalid option type";
		location.href = new Dropbox({ clientId: getAppKey(options.type) }).getAuthenticationUrl(
			encodeURIComponent(location.origin + location.pathname + "?source=oauth2&type=" + options.type),
			encodeURIComponent(JSON.stringify({ 
				type: options.type, 
				path: options.path, 
				user: options.user, 
				hash: options.hash 
			}))
		)
	}
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
