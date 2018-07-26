# TWITS loading data folders

This is my first run on loading data folders from Dropbox. So far it works better than I expected, and even seems fairly snappy on my usually terrible internet connection. Currently it works by completely rewritiing the loadTiddlersNode routine to be asynchronous and then making web requests instead of file requests. Thanks to RxJS, many of these web requests can be made at a time, allowing the browser to queue them and send them back to back. The Rx library requires a fair bit of thought as the paradigm is completely different, but the advantages are tremendous. 

Plugins specified in the `tiddlywiki.info` file are loaded through TiddlyServer, since it is configured to serve them by default. And TiddlyServer will benefit from this project as well. I hope to bring the ideas and code back into TiddlyServer to create a data folder adapter that has a much smaller memory footprint. 

Trying to keep the boot sequence in your head while translating it into async code is a nightmare! I'm still working on rewriting it to be more organized, but the code works. 

I'm quite pleased with the result. Even includeWikis works as long as it is relative and accessible within Dropbox. Currently the included wikis are readonly, but I may change that in the future. Plugin folders within the data folder should work but I haven't actually tested it yet. 

There will be a custom tiddlyweb adapter which will replace the regular one when specified in the `tiddlywiki.info` file to save tiddlers back to Dropbox. This will allow it to basically maintain the same folder structure on the server that it did on Node. The only difference between this and Node is that the server-side is completely removed, so any server-side code will simply do whatever it always does in the browser, assuming the wiki is normally served with `$:/core/save/all`.