# Markdown 2 Sharepoint

Takes documents with TOML front matter and markdown content and posts them to a Sharepoint blog (or other MetaWeblog API blog). I've tested it with Sharepoint 2010 and Wordpress 4.0 but it should work with others.

## Installation

Make sure you have `node.js` installed, then you just need:

    [sudo] npm install -g md2sp

This should install the `md2sp` tool globally on your machine.

## Usage

Markdown 2 Sharepoint is a command line app, when installed globally it should make available the `md2sp` tool. This tool can be used as follows:

    md2sp [[-e] <filename>]

If run without any parameters, it will attempt to set up a new connection by prompting for information. This can be used to set up a directory for your content files. Doing so will create an `md2sp.toml` file in the working folder with your configuration in it.

When you run the command with a filename as a parameter it will try to create a new post with the contents of that file. It will look for the `md2sp.toml` file in the current directory and all parent directories. If it cannot find one, it will fail. If it does, it will use that information to post your content.

If you haven't saved your password in the config file, it will prompt you each time you run the tool.

In order to edit a post, you will need to add the postid field to the metadata in the content file. This value will be returned after creating a new post. Once this is done, you can run the command with the `-e` flag to indicate editing. **The contents of the post will be overwritten with the contents of the file. If you have edited the post on the server, you may lose those changes.** 

## To Do

* Handle deleting posts
* Automatically add `postid` to newly added files
* Create a post file generator
* Support uploading images
* Save current date back to date-less posts
* Detect existing config files during setup
* Add tests!

