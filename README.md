# H5P Advent calendar
Do something nice before X-mas!

This is just a spare time project with the initial version hacked in merely
2 days on Nov 4, 2020 and Nov 5, 2020 while the world was eager to learn who'd
be the next president of the USA and I needed something to do while tracking
the latest poll results ;-)

It still lacks proper a11y support, was not tested on anything but Chrome and
may still have bugs - but feel free to improve the code!

## Getting started
Clone this repository with git and check out the branch that you are interested
in (or choose the branch first and then download the archive, but learning
how to use git really makes sense).

Change to the repository directory and run
```bash
npm install
```

to install required modules. Afterwards, you can build the project using
```bash
npm run build
```

or, if you want to let everything be built continuously while you are making
changes to the code, run
```bash
npm run watch
```
Before putting the code in production, you should always run `npm run build`.

The build process will transpile ES6 to earlier versions in order to improve
compatibility to older browsers. If you want to use particular functions that
some browsers don't support, you'll have to add a polyfill.

The build process will also move the source files into one distribution file and
minify the code.
