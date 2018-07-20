import { Chooser } from './chooser';
import { handleDatafolder } from './loader';

(window as any).$tw = { boot: { suppressBoot: true }, preloadTiddlers: [] };

document.addEventListener('load', () => {
	var container = document.createElement('div');
	container.classList.add('twits-chooser');
	document.body.appendChild(container);
	var chooser = new Chooser(container, options);
	chooser.loadChooser((stat) => {
		var prom = Promise.resolve(
			(typeof stat === "string") ? chooser.client.filesGetMetadata({ path: stat }) : stat
		).then(stat => {
			if (!chooser.isFileMetadata(stat)) {
				chooser.status.setStatusMessage("Invalid file selected");
				throw "Invalid file selected";
			}
			return handleDatafolder(chooser, stat);
		});
	})
});


const url = new URL(location.href);
const options = {
	type: decodeURIComponent(url.searchParams.get('type') || ''),
	path: decodeURIComponent(url.searchParams.get('path') || ''),
	user: decodeURIComponent(url.searchParams.get('user') || ''),
	hash: location.hash || ''
}
location.hash = "";

