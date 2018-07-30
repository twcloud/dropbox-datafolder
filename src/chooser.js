"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dropbox_1 = require("dropbox");
const common_1 = require("./common");
const async_1 = require("./async");
const SESSION_KEY = 'twcloud-dropbox-session';
const ORIGINAL_KEY = 'twcloud-dropbox-original';
const SCRIPT_KEY = 'twcloud-dropbox-script';
const PRELOAD_KEY = 'twcloud-dropbox-preload';
const SCRIPT_CACHE = "201807041";
class Chooser {
    constructor(container, options) {
        this.container = container;
        this.user = undefined;
        this.token = {};
        this.filelist = {};
        this.openFile = () => { };
        this.status = new common_1.StatusHandler("");
        if (options.type !== "apps" && options.type !== "full") {
            this.status.setStatusMessage("type must be apps or full");
            throw "type must be apps or full";
        }
        this.type = options.type;
        this.cloud = new async_1.CloudObject(new dropbox_1.Dropbox({ clientId: this.getKey() }));
        //save the preload info in case we don't have a dropbox token
        this.preload = {
            user: options.user,
            path: options.path,
            type: options.type
        };
        //if the hash has the access_token then it is the dropbox oauth response
        // this.token = devtoken as any;
        this.token = {};
        if (options.tokenHash) {
            let hash = options.tokenHash;
            if (hash.startsWith("#"))
                hash = hash.slice(1);
            hash.split('&').map(item => {
                let part = item.split('=');
                this.token[part[0]] = part[1];
            });
            this.cloud.client.setAccessToken(this.token.access_token);
            var preload = sessionStorage.getItem(PRELOAD_KEY);
            if (preload)
                this.preload = JSON.parse(preload);
            sessionStorage.setItem(PRELOAD_KEY, '');
        }
    }
    getKey() {
        return (this.type === "full" ? "gy3j4gsa191p31x"
            : (this.type === "apps" ? "tu8jc7jsdeg55ta"
                : ""));
    }
    loadChooser(callback) {
        this.openFile = callback;
        if (!this.token.access_token) {
            if (this.preload.path)
                sessionStorage.setItem(PRELOAD_KEY, JSON.stringify(this.preload));
            else
                sessionStorage.setItem(PRELOAD_KEY, '');
            location.href = this.cloud.client.getAuthenticationUrl(encodeURIComponent(location.origin + location.pathname + "?source=oauth2&type=" + this.type), "", "token");
            return;
        }
        this.status = new common_1.StatusHandler("");
        this.status.setStatusMessage("Loading account");
        Promise.all([
            this.cloud.filesListFolder({ path: "" }),
            this.cloud.client.usersGetCurrentAccount(undefined)
        ]).then(([files, _user]) => {
            this.user = _user;
            this.status = new common_1.StatusHandler(this.user.profile_photo_url || "");
            if (this.preload.user
                && (this.user.account_id !== this.preload.user
                    || this.token.account_id !== this.preload.user
                    || this.type !== this.preload.type)) {
                alert('You are logged into a different dropbox account than the one specified in this link');
                delete this.preload.user;
                delete this.preload.path;
                delete this.preload.type;
            }
            if (this.preload.path)
                return this.openFile(this.preload.path);
            this.container.appendChild(this.getHeaderElement());
            this.container.appendChild(this.getUserProfileElement());
            this.container.appendChild(this.getFilesListElement());
            this.container.appendChild(this.getFooterElement());
            this.readFolder(files, document.getElementById('twits-files'));
            // this.openFile("/arlennotes/arlen-nature/tiddlywiki.info");
        });
    }
    getHeaderElement() {
        const header = document.createElement('div');
        header.id = "twits-header";
        header.innerHTML = `
		<h1>
			<span class="line1">TiddlyWiki in the Sky </span><br>
			<span class="line2">using Dropbox</span><br/>
			<span class="line3">(by <a href="https://github.com/Arlen22">@Arlen22</a>*) <span class="twits-beta">beta</span></span>
		</h1>`;
        return header;
    }
    getUserProfileElement() {
        const profile = document.createElement('div');
        profile.id = "twits-profile";
        const pic = document.createElement('img');
        pic.src = this.user.profile_photo_url || "";
        pic.classList.add("profile-pic");
        profile.appendChild(pic);
        const textdata = document.createElement('span');
        textdata.innerText = this.user.name.display_name
            + (this.user.team ? ("\n" + this.user.team.name) : "");
        textdata.classList.add(this.user.team ? "profile-name-team" : "profile-name");
        profile.appendChild(textdata);
        return profile;
    }
    getFilesListElement() {
        const el = document.createElement('div');
        el.id = "twits-files";
        return el;
    }
    getFooterElement() {
        const el = document.createElement('div');
        el.id = "twits-footer";
        el.innerHTML = `
	<p>
		Comments or questions are welcome at
		<a href="https://github.com/twcloud/dropbox-datafolder">https://github.com/twcloud/dropbox-datafolder</a>
	</p>
	<p>
		*Originally built by <a href="http://twitter.com/Jermolene">@Jermolene</a> for TWC, and updated 
		by <a href="https://github.com/Arlen22">@Arlen22</a> to use the Dropbox v2 API and work with TW5.
	</p>
	<p>
		**The TiddlyWiki files and datafolders you open have full access to the page, they are not sandboxed in any way.
	</p>
`;
        return el;
    }
    isFileMetadata(a) {
        return a[".tag"] === "file";
    }
    isFolderMetadata(a) {
        return a[".tag"] === "folder";
    }
    isHtmlFile(stat) {
        return ['.htm', '.html'].indexOf(stat.name.slice(stat.name.lastIndexOf('.'))) > -1;
    }
    isTWInfoFile(stat) {
        return stat.name === "tiddlywiki.info";
    }
    getHumanSize(size) {
        const TAGS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
        let power = 0;
        while (size >= 1024) {
            size /= 1024;
            power++;
        }
        return size.toFixed(1) + TAGS[power];
    }
    streamFilesListFolder(folderpath, handler) {
        this.cloud.filesListFolder({ path: folderpath }).then((entries) => {
            handler(entries);
        });
    }
    readFolder(folderpath, parentNode) {
        const pageurl = new URL(location.href);
        const loadingMessage = document.createElement("div");
        loadingMessage.innerText = "Loading...";
        loadingMessage.classList.add("loading-message");
        var listParent = document.createElement("div");
        listParent.classList.add("twits-folderlist");
        listParent.appendChild(loadingMessage);
        parentNode.appendChild(listParent);
        // const filelist: files.ListFolderResult["entries"] = [];
        Promise.resolve(Array.isArray(folderpath)
            ? folderpath : this.cloud.filesListFolder({ path: folderpath })).then((stats) => {
            // filelist.push.apply(filelist, stats);
            stats.forEach(e => this.filelist[e.path_lower] = e);
            loadingMessage.innerText = "Loading " + stats.length + "...";
            loadingMessage.remove();
            stats.sort((a, b) => 
            //order by isFolder DESC, name ASC
            (+this.isFolderMetadata(b) - +this.isFolderMetadata(a)) || a.name.localeCompare(b.name));
            for (var t = 0; t < stats.length; t++) {
                const stat = stats[t];
                var listItem = document.createElement("div"), classes = [], type = "";
                if (this.isFolderMetadata(stat)) {
                    classes.push("twits-folder");
                    type = "folder";
                }
                else if (this.isFileMetadata(stat)) {
                    classes.push("twits-file");
                    if (this.isHtmlFile(stat)) {
                        classes.push("twits-file-html");
                        type = "files/htmlfile";
                    }
                    else if (this.isTWInfoFile(stat)) {
                        classes.push("twits-file-twinfo");
                        type = "datafolder";
                    }
                    else {
                        classes.push("twits-file-other");
                        type = "other";
                    }
                }
                var link;
                classes.push("twits-file-entry");
                if (this.isFolderMetadata(stat) || (this.isFileMetadata(stat) && (this.isHtmlFile(stat) || this.isTWInfoFile(stat)))) {
                    link = document.createElement("a");
                    link.href = location.origin + location.pathname + location.search
                        + "&path=" + encodeURIComponent(stat.path_lower)
                        + "&user=" + encodeURIComponent(this.user.account_id) + location.hash;
                    link.setAttribute("data-twits-path", stat.path_lower);
                    link.addEventListener("click", this.onClickFolderEntry(), false);
                }
                else {
                    link = document.createElement("span");
                }
                link.className = classes.join(" ");
                var img = document.createElement("img");
                img.src = "icons/" + type + ".png";
                img.style.width = "16px";
                img.style.height = "16px";
                link.appendChild(img);
                link.appendChild(document.createTextNode(stat.name));
                if (this.isFileMetadata(stat) && this.getHumanSize(stat.size)) {
                    var size = document.createElement("span");
                    size.appendChild(document.createTextNode(" (" + this.getHumanSize(stat.size) + ")"));
                    link.appendChild(size);
                }
                listItem.appendChild(link);
                listParent.appendChild(listItem);
            }
        });
    }
    ;
    onClickFolderEntry() {
        const self = this;
        return function (event) {
            if (event.altKey || event.ctrlKey || event.shiftKey)
                return true;
            var filepath = this.getAttribute("data-twits-path") || "";
            if (this.classList.contains("twits-folder") && !this.classList.contains("twits-folder-open")) {
                this.classList.add("twits-folder-open");
                self.readFolder(filepath, this.parentNode);
            }
            else {
                var type = this.classList.contains("twits-file-html") ? "htmlfile" :
                    this.classList.contains("twits-file-twinfo") ? "datafolder" : "";
                var meta = self.filelist[filepath];
                self.openFile(self.isFileMetadata(meta) ? meta : filepath);
            }
            event.preventDefault();
            return false;
        };
    }
}
exports.Chooser = Chooser;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hvb3Nlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNob29zZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxxQ0FBc0Q7QUFDdEQscUNBQThEO0FBQzlELG1DQUFzQztBQUV0QyxNQUFNLFdBQVcsR0FBRyx5QkFBeUIsQ0FBQztBQUM5QyxNQUFNLFlBQVksR0FBRywwQkFBMEIsQ0FBQztBQUNoRCxNQUFNLFVBQVUsR0FBRyx3QkFBd0IsQ0FBQztBQUM1QyxNQUFNLFdBQVcsR0FBRyx5QkFBeUIsQ0FBQztBQUM5QyxNQUFNLFlBQVksR0FBRyxXQUFXLENBQUM7QUFpQmpDO0lBZUMsWUFBbUIsU0FBeUIsRUFBRSxPQUFxQjtRQUFoRCxjQUFTLEdBQVQsU0FBUyxDQUFnQjtRQWI1QyxTQUFJLEdBQXNCLFNBQWdCLENBQUM7UUFHM0MsVUFBSyxHQUFrQixFQUFTLENBQUM7UUFDakMsYUFBUSxHQUEyQyxFQUFFLENBQUM7UUF3Q3RELGFBQVEsR0FBcUIsUUFBUSxDQUFDLENBQUM7UUE5QnRDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxzQkFBYSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3BDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEtBQUssTUFBTSxJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQztZQUN4RCxJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLDJCQUEyQixDQUFDLENBQUM7WUFDMUQsTUFBTSwyQkFBMkIsQ0FBQztRQUNuQyxDQUFDO1FBQ0QsSUFBSSxDQUFDLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxtQkFBVyxDQUFDLElBQUksaUJBQU8sQ0FBQyxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdkUsNkRBQTZEO1FBQzdELElBQUksQ0FB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